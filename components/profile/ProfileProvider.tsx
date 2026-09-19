"use client";

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BACKEND_PREFIX,
  BackendClientError,
  StaleProfileResponseError,
  buildBackendHeaders,
  responseBelongsToProfile,
  type ProfileId,
  type ProfileInfo,
  type ProfileSession,
} from "@/lib/backend/client";
import { clearSpeechCache, stopSpeaking } from "@/lib/voice/speech";
import { LegacyMigrationGate } from "@/components/profile/LegacyMigrationGate";
import {
  MIGRATION_PLAN_KEY,
  MIGRATION_REVIEWED_KEY,
  classifyLegacyStorage,
  hasLegacyHealthData,
} from "@/lib/migration/legacy";

const PROFILE_CHANGING_EVENT = "carebridge:profile-changing";
const PROFILE_CHANGED_EVENT = "carebridge:profile-changed";
const ASSISTANT_HANDOFF_KEY = "carebridge.pending-message.v1";

type RequestOptions = {
  expectedContext?: string;
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

type ProfileContextValue = {
  profile: ProfileInfo;
  profiles: ProfileInfo[];
  context: string;
  switching: boolean;
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
  switchProfile: (userId: ProfileId) => Promise<void>;
  recoverSession: () => Promise<ProfileSession>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

async function responseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({ error: "invalid-response" }))) as
    | T
    | { error: string };
  if (!response.ok) {
    const code =
      typeof data === "object" && data !== null && "error" in data
        ? String(data.error)
        : "backend-operation-failed";
    throw new BackendClientError(response.status, code);
  }
  return data as T;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ProfileSession | null>(null);
  const [switching, setSwitching] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef("");
  const controllers = useRef(new Set<AbortController>());

  const abortInFlight = useCallback(() => {
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
  }, []);

  const establishSession = useCallback(async (): Promise<ProfileSession> => {
    let response = await fetch(`${BACKEND_PREFIX}/session`, {
      method: "GET",
      cache: "no-store",
    });
    if (response.status === 401) {
      response = await fetch(`${BACKEND_PREFIX}/session`, {
        method: "POST",
        cache: "no-store",
        headers: buildBackendHeaders("", "POST", true),
        body: "{}",
      });
    }
    const next = await responseJson<ProfileSession>(response);
    const migrationInProgress = Boolean(
      window.sessionStorage.getItem(MIGRATION_PLAN_KEY),
    );
    const alreadyReviewed =
      window.localStorage.getItem(MIGRATION_REVIEWED_KEY) === "yes";
    setMigrationRequired(
      migrationInProgress ||
        (!alreadyReviewed &&
          hasLegacyHealthData(classifyLegacyStorage(window.localStorage))),
    );
    contextRef.current = next.context;
    setSession(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void establishSession()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof BackendClientError
              ? cause.code
              : "The local profile backend could not be started.",
          );
        }
      });
    return () => {
      cancelled = true;
      abortInFlight();
    };
  }, [abortInFlight, establishSession]);

  const recoverSession = useCallback(async () => {
    abortInFlight();
    stopSpeaking();
    clearSpeechCache();
    window.sessionStorage.removeItem(ASSISTANT_HANDOFF_KEY);
    const next = await establishSession();
    window.dispatchEvent(
      new CustomEvent(PROFILE_CHANGED_EVENT, { detail: { context: next.context } }),
    );
    return next;
  }, [abortInFlight, establishSession]);

  const request = useCallback(
    async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
      const method = options.method ?? "GET";
      const requestContext = contextRef.current;
      if (!requestContext) throw new BackendClientError(401, "session-required");
      if (options.expectedContext && options.expectedContext !== requestContext) throw new StaleProfileResponseError();
      if (options.signal?.aborted) throw new StaleProfileResponseError();

      const controller = new AbortController();
      controllers.current.add(controller);
      const onAbort = () => controller.abort();
      options.signal?.addEventListener("abort", onAbort, { once: true });

      try {
        const response = await fetch(`${BACKEND_PREFIX}/${path.replace(/^\/+/, "")}`, {
          method,
          cache: "no-store",
          signal: controller.signal,
          headers: buildBackendHeaders(
            requestContext,
            method,
            options.body !== undefined,
          ),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });

        /*
          A response produced under the old profile is unusable even if it was
          otherwise successful. This check happens before JSON reaches React.
        */
        const responseContext = response.headers.get("X-CareBridge-Context");
        if (
          !responseBelongsToProfile(
            requestContext,
            contextRef.current,
            response.ok ? responseContext : null,
          )
        ) {
          throw new StaleProfileResponseError();
        }

        const data = await responseJson<T>(response);
        if (requestContext !== contextRef.current || controller.signal.aborted) throw new StaleProfileResponseError();
        return data;
      } finally {
        controllers.current.delete(controller);
        options.signal?.removeEventListener("abort", onAbort);
      }
    },
    [],
  );

  const switchProfile = useCallback(
    async (userId: ProfileId) => {
      if (!session || session.profile.id === userId || switching) return;

      setSwitching(true);
      setError(null);
      window.dispatchEvent(new Event(PROFILE_CHANGING_EVENT));
      abortInFlight();
      stopSpeaking();
      clearSpeechCache();
      window.sessionStorage.removeItem(ASSISTANT_HANDOFF_KEY);

      const oldContext = contextRef.current;
      try {
        const response = await fetch(`${BACKEND_PREFIX}/profile`, {
          method: "POST",
          cache: "no-store",
          headers: buildBackendHeaders(oldContext, "POST", true),
          body: JSON.stringify({ userId }),
        });
        const next = await responseJson<ProfileSession>(response);
        contextRef.current = next.context;
        setSession(next);
        window.dispatchEvent(
          new CustomEvent(PROFILE_CHANGED_EVENT, {
            detail: { context: next.context, profile: next.profile },
          }),
        );
      } catch (cause) {
        setError(
          cause instanceof BackendClientError
            ? cause.code
            : "The profile could not be switched.",
        );
        await establishSession().catch(() => undefined);
        throw cause;
      } finally {
        setSwitching(false);
      }
    },
    [abortInFlight, establishSession, session, switching],
  );

  const value = useMemo<ProfileContextValue | null>(
    () =>
      session
        ? {
            profile: session.profile,
            profiles: session.profiles,
            context: session.context,
            switching,
            request,
            switchProfile,
            recoverSession,
          }
        : null,
    [recoverSession, request, session, switchProfile, switching],
  );

  if (error && !session) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="card p-6" role="alert">
          <h1 className="text-2xl font-semibold">HealthThread could not open your profile</h1>
          <p className="mt-2 text-muted">{error}</p>
          <p className="mt-2 text-sm text-muted">
            HealthThread profiles run only on this computer. Open the app at localhost or
            127.0.0.1, then try again.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!value || switching || migrationRequired === null) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16" aria-busy="true">
        <div className="card p-6">
          <p className="label">{switching ? "Switching profile" : "Opening HealthThread"}</p>
          <p className="mt-2 text-lg text-muted">
            {switching
              ? "Clearing the previous profile before loading the next one…"
              : "Loading your private health context…"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <ProfileContext.Provider value={value}>
      {migrationRequired ? (
        <LegacyMigrationGate
          profile={value.profile}
          request={value.request}
          switchProfile={value.switchProfile}
          onComplete={() => setMigrationRequired(false)}
        />
      ) : (
        <Fragment key={value.context}>{children}</Fragment>
      )}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside ProfileProvider");
  return value;
}

export { PROFILE_CHANGED_EVENT, PROFILE_CHANGING_EVENT };
