import { DraftEvent, type Category } from "@/lib/schema";

export type GuidedTopic = "cycle" | "urinary" | "bowel" | "condition";
export type GuidedLanguage = "en" | "es";
export type GuidedAnswer = string | string[] | number | null | undefined;
export type GuidedAnswers = Record<string, GuidedAnswer>;

export type GuidedOption = { id: string; label: string };
export type GuidedQuestion = {
  id: string;
  kind: "single" | "multi" | "date" | "scale" | "text";
  prompt: string;
  help?: string;
  required?: boolean;
  options?: GuidedOption[];
  showWhen?: { id: string; equals: string };
};

type TopicCopy = {
  label: string;
  description: string;
  questions: GuidedQuestion[];
};

type GuidedCopy = {
  intro: string;
  privacy: string;
  safety: string;
  choose: string;
  question: string;
  of: string;
  next: string;
  skip: string;
  back: string;
  review: string;
  reviewTitle: string;
  editAnswers: string;
  save: string;
  saving: string;
  saved: string;
  another: string;
  required: string;
  nothingSaved: string;
  scaleLabel: string;
  topics: Record<GuidedTopic, TopicCopy>;
};

const onsetEnglish: GuidedOption[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "fewDays", label: "A few days ago" },
  { id: "week", label: "More than a week ago" },
  { id: "ongoing", label: "It has been happening for a while" },
  { id: "unsure", label: "I’m not sure" },
];

const onsetSpanish: GuidedOption[] = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "fewDays", label: "Hace unos días" },
  { id: "week", label: "Hace más de una semana" },
  { id: "ongoing", label: "Ha estado pasando desde hace tiempo" },
  { id: "unsure", label: "No estoy seguro/a" },
];

export const GUIDED_COPY: Record<GuidedLanguage, GuidedCopy> = {
  en: {
    intro: "Choose one area. HealthThread will ask one short question at a time.",
    privacy: "These questions organize your history for you and your clinician. They do not diagnose a condition or decide what is causing a symptom.",
    safety: "HealthThread does not monitor emergencies. If you may be in immediate danger, contact your local emergency service.",
    choose: "What would you like to check in about?",
    question: "Question",
    of: "of",
    next: "Next question",
    skip: "Skip this question",
    back: "Back",
    review: "Review answers",
    reviewTitle: "Check what will be recorded",
    editAnswers: "Change an answer",
    save: "Confirm and save this check-in",
    saving: "Saving…",
    saved: "This check-in was added to your health timeline.",
    another: "Record another check-in",
    required: "Choose at least one answer to continue.",
    nothingSaved: "Nothing is saved until you review your answers and choose Confirm and save.",
    scaleLabel: "How much is this affecting you right now?",
    topics: {
      cycle: {
        label: "Period or bleeding",
        description: "Flow, timing, clots, changes from usual, and related symptoms.",
        questions: [
          {
            id: "recordType",
            kind: "single",
            required: true,
            prompt: "What are you recording?",
            options: [
              { id: "period", label: "A period" },
              { id: "between", label: "Spotting or bleeding between periods" },
              { id: "late", label: "A missed or late period" },
              { id: "afterSex", label: "Bleeding after sex" },
              { id: "other", label: "Another cycle change" },
            ],
          },
          { id: "startDate", kind: "date", prompt: "What date did this bleeding or change begin?", help: "Leave this blank if you are not sure." },
          {
            id: "flow",
            kind: "single",
            prompt: "How would you describe the bleeding?",
            help: "Choose what is closest. ‘Every hour’ means soaking through a pad or tampon about every hour for several hours.",
            options: [
              { id: "spotting", label: "Spotting" },
              { id: "light", label: "Light" },
              { id: "medium", label: "Medium" },
              { id: "heavy", label: "Heavy" },
              { id: "hourly", label: "Soaking through protection about every hour" },
              { id: "none", label: "No bleeding right now" },
              { id: "unsure", label: "Not sure" },
            ],
          },
          {
            id: "duration",
            kind: "single",
            prompt: "How long has the bleeding lasted?",
            options: [
              { id: "underDay", label: "Less than a day" },
              { id: "oneThree", label: "1–3 days" },
              { id: "fourSeven", label: "4–7 days" },
              { id: "overSeven", label: "More than 7 days" },
              { id: "ongoing", label: "It is still happening" },
              { id: "notApplicable", label: "Not applicable" },
              { id: "unsure", label: "Not sure" },
            ],
          },
          {
            id: "usual",
            kind: "single",
            prompt: "How does this compare with what is usual for you?",
            options: [
              { id: "lighter", label: "Lighter than usual" },
              { id: "same", label: "About the same" },
              { id: "heavier", label: "Heavier than usual" },
              { id: "new", label: "This is new or unexpected" },
              { id: "unsure", label: "Not sure" },
            ],
          },
          {
            id: "clots",
            kind: "single",
            prompt: "Have you noticed blood clots?",
            help: "The size comparison helps a clinician understand the amount without guessing.",
            options: [
              { id: "none", label: "No clots" },
              { id: "small", label: "Smaller than a quarter" },
              { id: "large", label: "About the size of a quarter or larger" },
              { id: "unsure", label: "Not sure" },
            ],
          },
          {
            id: "related",
            kind: "multi",
            prompt: "Are you noticing any of these at the same time?",
            options: [
              { id: "cramps", label: "Cramps or pelvic pain" },
              { id: "dizzy", label: "Dizziness or light-headedness" },
              { id: "breath", label: "Shortness of breath" },
              { id: "tired", label: "Unusual tiredness" },
              { id: "none", label: "None of these" },
            ],
          },
          {
            id: "pregnancy",
            kind: "single",
            prompt: "Could pregnancy be possible?",
            help: "This is optional. You can skip it or choose Prefer not to answer.",
            options: [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unsure", label: "Not sure" },
              { id: "prefer", label: "Prefer not to answer" },
            ],
          },
          { id: "note", kind: "text", prompt: "Anything else you want your clinician to know?" },
        ],
      },
      urinary: {
        label: "Bladder or urination",
        description: "Burning, urgency, frequency, leakage, urine changes, and related symptoms.",
        questions: [
          {
            id: "symptoms",
            kind: "multi",
            required: true,
            prompt: "What have you noticed? Choose all that apply.",
            options: [
              { id: "burning", label: "Burning or pain when urinating" },
              { id: "frequency", label: "Going more often than usual" },
              { id: "urgency", label: "A sudden or strong urge to go" },
              { id: "little", label: "Only a little urine comes out" },
              { id: "difficulty", label: "Difficulty starting or emptying" },
              { id: "leaking", label: "Leaking urine" },
              { id: "unable", label: "Unable to pass urine" },
              { id: "other", label: "Something else" },
            ],
          },
          { id: "onset", kind: "single", required: true, prompt: "When did this start?", options: onsetEnglish },
          {
            id: "urine",
            kind: "multi",
            prompt: "Have you noticed a change in your urine?",
            options: [
              { id: "cloudy", label: "Cloudy" },
              { id: "blood", label: "Pink, red, or visible blood" },
              { id: "smell", label: "Stronger or unusual smell" },
              { id: "dark", label: "Darker than usual" },
              { id: "none", label: "No change noticed" },
            ],
          },
          {
            id: "related",
            kind: "multi",
            prompt: "Are you noticing any of these at the same time?",
            options: [
              { id: "lowerPain", label: "Lower belly or pelvic discomfort" },
              { id: "backPain", label: "Back, side, or groin pain" },
              { id: "fever", label: "Fever or chills" },
              { id: "nausea", label: "Nausea or vomiting" },
              { id: "none", label: "None of these" },
            ],
          },
          { id: "severity", kind: "scale", prompt: "How much is this affecting you right now?" },
          {
            id: "pregnancy",
            kind: "single",
            prompt: "Could pregnancy be possible?",
            help: "This is optional. You can skip it or choose Prefer not to answer.",
            options: [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unsure", label: "Not sure" },
              { id: "prefer", label: "Prefer not to answer" },
            ],
          },
          { id: "note", kind: "text", prompt: "Anything else you want your clinician to know?" },
        ],
      },
      bowel: {
        label: "Bowel movements",
        description: "Frequency, stool form, urgency, pain, blood, and other changes.",
        questions: [
          {
            id: "changes",
            kind: "multi",
            required: true,
            prompt: "What has changed? Choose all that apply.",
            options: [
              { id: "constipation", label: "Hard or difficult to pass" },
              { id: "diarrhea", label: "Loose or watery" },
              { id: "more", label: "Going more often" },
              { id: "less", label: "Going less often" },
              { id: "urgent", label: "A sudden or urgent need to go" },
              { id: "incomplete", label: "Feeling that not everything passed" },
              { id: "leakage", label: "Loss of bowel control or leakage" },
              { id: "other", label: "Something else" },
            ],
          },
          { id: "onset", kind: "single", required: true, prompt: "When did this change start?", options: onsetEnglish },
          {
            id: "appearance",
            kind: "multi",
            prompt: "What did the stool look like?",
            options: [
              { id: "hard", label: "Hard, dry, or lumpy" },
              { id: "formed", label: "Soft and formed" },
              { id: "loose", label: "Loose or watery" },
              { id: "red", label: "Red blood" },
              { id: "black", label: "Black or tarry" },
              { id: "mucus", label: "Mucus or pus" },
              { id: "unsure", label: "Not sure" },
            ],
          },
          {
            id: "frequency",
            kind: "single",
            prompt: "Which is closest to what is happening?",
            options: [
              { id: "noneThree", label: "No bowel movement for 3 or more days" },
              { id: "underThreeWeek", label: "Fewer than 3 in a week" },
              { id: "oneTwo", label: "About 1–2 a day" },
              { id: "threeFive", label: "3–5 loose stools a day" },
              { id: "sixPlus", label: "6 or more loose stools a day" },
              { id: "different", label: "Different from these choices" },
              { id: "unsure", label: "Not sure" },
            ],
          },
          {
            id: "related",
            kind: "multi",
            prompt: "Are you noticing any of these at the same time?",
            options: [
              { id: "bellyPain", label: "Belly pain or cramping" },
              { id: "rectalPain", label: "Rectal pain" },
              { id: "noGas", label: "Unable to pass gas" },
              { id: "vomiting", label: "Vomiting" },
              { id: "fever", label: "Fever or chills" },
              { id: "dizzy", label: "Dizziness or light-headedness" },
              { id: "none", label: "None of these" },
            ],
          },
          { id: "severity", kind: "scale", prompt: "How much is this affecting you right now?" },
          { id: "note", kind: "text", prompt: "Anything else you want your clinician to know?" },
        ],
      },
      condition: {
        label: "Ongoing condition or treatment",
        description: "Heart, breathing, diabetes, cancer care, hormones/PCOS, mobility, kidney, or memory changes.",
        questions: [
          {
            id: "conditionArea",
            kind: "single",
            required: true,
            prompt: "Which health area are you checking in about?",
            help: "Choose the closest area. This records what you notice; it does not decide whether you have a condition.",
            options: [
              { id: "heart", label: "Heart or circulation" },
              { id: "breathing", label: "Breathing or lung condition" },
              { id: "diabetes", label: "Diabetes or blood sugar" },
              { id: "cancer", label: "Cancer care or treatment effects" },
              { id: "hormones", label: "Hormones, PCOS, or reproductive health" },
              { id: "mobility", label: "Joint pain, arthritis, or mobility" },
              { id: "memory", label: "Memory, balance, vision, or hearing" },
              { id: "kidney", label: "Kidney or fluid changes" },
              { id: "other", label: "Another ongoing condition" },
            ],
          },
          {
            id: "heartChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "heart" },
            prompt: "What heart or circulation change have you noticed? Choose all that apply.", options: [
              { id: "breath", label: "New or worse shortness of breath" },
              { id: "chest", label: "Chest pain, pressure, or heaviness" },
              { id: "heartbeat", label: "Racing, pounding, or irregular heartbeat" },
              { id: "swelling", label: "New or worse swelling in feet, ankles, legs, or belly" },
              { id: "fatigue", label: "Unusual fatigue or lower activity tolerance" },
              { id: "dizzy", label: "Dizziness, light-headedness, or fainting" },
              { id: "weight", label: "A quick or unexpected weight change" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "breathingChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "breathing" },
            prompt: "What breathing or lung change have you noticed? Choose all that apply.", options: [
              { id: "breath", label: "Shortness of breath" },
              { id: "cough", label: "New or changing cough" },
              { id: "mucus", label: "More mucus or a change in its color" },
              { id: "wheeze", label: "Wheezing or noisy breathing" },
              { id: "tight", label: "Chest tightness or heaviness" },
              { id: "activity", label: "Less able to walk or do usual activities" },
              { id: "night", label: "Breathing is worse at night or when lying flat" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "diabetesChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "diabetes" },
            prompt: "What blood-sugar-related change have you noticed? Choose all that apply.", options: [
              { id: "reading", label: "A glucose reading outside my personal target" },
              { id: "thirst", label: "More thirsty or hungry than usual" },
              { id: "urination", label: "Urinating more often" },
              { id: "low", label: "Shaky, sweaty, weak, dizzy, or confused" },
              { id: "vision", label: "Blurred or changing vision" },
              { id: "numb", label: "Numbness, tingling, or burning in hands or feet" },
              { id: "wound", label: "A cut, sore, or wound healing slowly" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "cancerChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "cancer" },
            prompt: "What has changed during or after cancer care? Choose all that apply.", options: [
              { id: "fatigue", label: "Fatigue or difficulty doing usual activities" },
              { id: "pain", label: "New, changing, or breakthrough pain" },
              { id: "nausea", label: "Nausea or vomiting" },
              { id: "appetite", label: "Appetite, eating, swallowing, or weight change" },
              { id: "bowel", label: "Constipation, diarrhea, or another bowel change" },
              { id: "swelling", label: "Swelling, bruising, bleeding, or skin change" },
              { id: "nerve", label: "Numbness, tingling, weakness, or balance change" },
              { id: "fever", label: "Fever, chills, or flu-like symptoms" },
              { id: "sleep", label: "Sleep, memory, concentration, or mood change" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "hormoneChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "hormones" },
            prompt: "What hormone, PCOS, or reproductive-health change have you noticed?", options: [
              { id: "cycle", label: "Irregular, missed, or changing periods" },
              { id: "bleeding", label: "Heavy bleeding or spotting" },
              { id: "pelvic", label: "Pelvic pain or pressure" },
              { id: "hair", label: "New facial/body hair or scalp hair thinning" },
              { id: "skin", label: "Acne, oily skin, or darker/thicker skin patches" },
              { id: "weight", label: "Weight, appetite, or energy change" },
              { id: "fertility", label: "Fertility, pregnancy, or sexual-health concern" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "mobilityChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "mobility" },
            prompt: "What joint or mobility change have you noticed? Choose all that apply.", options: [
              { id: "pain", label: "Joint or muscle pain" },
              { id: "stiff", label: "Stiffness or reduced range of motion" },
              { id: "swelling", label: "Joint swelling, warmth, or redness" },
              { id: "weak", label: "Weakness or unusual fatigue" },
              { id: "walking", label: "More difficulty standing, walking, or using stairs" },
              { id: "daily", label: "More difficulty with usual daily tasks" },
              { id: "fall", label: "A fall, near-fall, or new fear of falling" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "memoryChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "memory" },
            prompt: "What change have you noticed? Choose all that apply.", options: [
              { id: "forget", label: "More forgetful than usual" },
              { id: "confused", label: "Confusion or trouble following familiar steps" },
              { id: "words", label: "Trouble finding words or following conversations" },
              { id: "tasks", label: "Trouble managing medicine, appointments, money, or travel" },
              { id: "balance", label: "Dizziness, balance trouble, a fall, or near-fall" },
              { id: "vision", label: "A vision change" },
              { id: "hearing", label: "A hearing change" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "kidneyChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "kidney" },
            prompt: "What kidney or fluid change have you noticed? Choose all that apply.", options: [
              { id: "swelling", label: "Swelling in feet, ankles, legs, hands, face, or belly" },
              { id: "urine", label: "A change in urine amount, color, foam, or blood" },
              { id: "frequency", label: "A change in how often I urinate" },
              { id: "pain", label: "Back, side, or groin pain" },
              { id: "fatigue", label: "Fatigue, weakness, nausea, or appetite change" },
              { id: "breath", label: "Shortness of breath" },
              { id: "pressure", label: "A blood-pressure change" },
              { id: "other", label: "Something else" },
            ],
          },
          {
            id: "otherChanges", kind: "text", required: true, showWhen: { id: "conditionArea", equals: "other" },
            prompt: "What changed with your condition or treatment?",
          },
          { id: "onset", kind: "single", required: true, prompt: "When did this change start?", options: onsetEnglish },
          {
            id: "context", kind: "multi", prompt: "What was happening around this change? Choose any that fit.", options: [
              { id: "newMedicine", label: "I started or changed a medicine or dose" },
              { id: "missedMedicine", label: "I missed or could not take medicine" },
              { id: "treatment", label: "It happened during or after a treatment or procedure" },
              { id: "activity", label: "It changes with activity, meals, sleep, or time of day" },
              { id: "noChange", label: "No known treatment or routine change" },
              { id: "unsure", label: "I’m not sure" },
              { id: "prefer", label: "Prefer not to answer" },
            ],
          },
          { id: "severity", kind: "scale", prompt: "How much is this affecting your usual day right now?" },
          { id: "measurements", kind: "text", prompt: "Do you want to include a measurement?", help: "Optional examples: blood pressure, pulse, weight, temperature, oxygen level, or glucose—include the number, unit, date, and whether it came from a device." },
          { id: "note", kind: "text", prompt: "Anything else you want your clinician to know?" },
        ],
      },
    },
  },
  es: {
    intro: "Elige un área. HealthThread hará una pregunta corta a la vez.",
    privacy: "Estas preguntas organizan tu historial para ti y tu profesional de salud. No diagnostican una condición ni deciden la causa de un síntoma.",
    safety: "HealthThread no supervisa emergencias. Si crees que corres peligro inmediato, comunícate con el servicio de emergencias de tu localidad.",
    choose: "¿Sobre qué te gustaría hacer un registro?",
    question: "Pregunta",
    of: "de",
    next: "Siguiente pregunta",
    skip: "Omitir esta pregunta",
    back: "Atrás",
    review: "Revisar respuestas",
    reviewTitle: "Revisa lo que se va a registrar",
    editAnswers: "Cambiar una respuesta",
    save: "Confirmar y guardar este registro",
    saving: "Guardando…",
    saved: "Este registro se agregó a tu cronología de salud.",
    another: "Registrar otra actualización",
    required: "Elige al menos una respuesta para continuar.",
    nothingSaved: "Nada se guarda hasta que revises tus respuestas y elijas Confirmar y guardar.",
    scaleLabel: "¿Cuánto te está afectando esto ahora?",
    topics: {
      cycle: {
        label: "Período o sangrado",
        description: "Flujo, fechas, coágulos, cambios de lo habitual y síntomas relacionados.",
        questions: [
          {
            id: "recordType", kind: "single", required: true, prompt: "¿Qué estás registrando?", options: [
              { id: "period", label: "Un período" },
              { id: "between", label: "Manchado o sangrado entre períodos" },
              { id: "late", label: "Un período atrasado o ausente" },
              { id: "afterSex", label: "Sangrado después de tener relaciones" },
              { id: "other", label: "Otro cambio del ciclo" },
            ],
          },
          { id: "startDate", kind: "date", prompt: "¿En qué fecha comenzó este sangrado o cambio?", help: "Déjalo en blanco si no estás seguro/a." },
          {
            id: "flow", kind: "single", prompt: "¿Cómo describirías el sangrado?", help: "Elige la opción más cercana. ‘Cada hora’ significa empapar una toalla o tampón aproximadamente cada hora durante varias horas.", options: [
              { id: "spotting", label: "Manchado" }, { id: "light", label: "Ligero" },
              { id: "medium", label: "Medio" }, { id: "heavy", label: "Abundante" },
              { id: "hourly", label: "Empapa la protección aproximadamente cada hora" },
              { id: "none", label: "No hay sangrado ahora" }, { id: "unsure", label: "No estoy seguro/a" },
            ],
          },
          {
            id: "duration", kind: "single", prompt: "¿Cuánto tiempo ha durado el sangrado?", options: [
              { id: "underDay", label: "Menos de un día" }, { id: "oneThree", label: "1–3 días" },
              { id: "fourSeven", label: "4–7 días" }, { id: "overSeven", label: "Más de 7 días" },
              { id: "ongoing", label: "Todavía está ocurriendo" }, { id: "notApplicable", label: "No corresponde" },
              { id: "unsure", label: "No estoy seguro/a" },
            ],
          },
          {
            id: "usual", kind: "single", prompt: "¿Cómo se compara con lo habitual para ti?", options: [
              { id: "lighter", label: "Más ligero de lo habitual" }, { id: "same", label: "Más o menos igual" },
              { id: "heavier", label: "Más abundante de lo habitual" }, { id: "new", label: "Es nuevo o inesperado" },
              { id: "unsure", label: "No estoy seguro/a" },
            ],
          },
          {
            id: "clots", kind: "single", prompt: "¿Has notado coágulos de sangre?", help: "La comparación de tamaño ayuda a tu profesional de salud a entender la cantidad sin adivinar.", options: [
              { id: "none", label: "Sin coágulos" }, { id: "small", label: "Más pequeños que una moneda de 25 centavos" },
              { id: "large", label: "Del tamaño de una moneda de 25 centavos o más grandes" },
              { id: "unsure", label: "No estoy seguro/a" },
            ],
          },
          {
            id: "related", kind: "multi", prompt: "¿Notas alguna de estas cosas al mismo tiempo?", options: [
              { id: "cramps", label: "Cólicos o dolor pélvico" }, { id: "dizzy", label: "Mareo o aturdimiento" },
              { id: "breath", label: "Falta de aire" }, { id: "tired", label: "Cansancio inusual" },
              { id: "none", label: "Ninguna de estas" },
            ],
          },
          {
            id: "pregnancy", kind: "single", prompt: "¿Es posible un embarazo?", help: "Esto es opcional. Puedes omitirlo o elegir Prefiero no responder.", options: [
              { id: "yes", label: "Sí" }, { id: "no", label: "No" }, { id: "unsure", label: "No estoy seguro/a" },
              { id: "prefer", label: "Prefiero no responder" },
            ],
          },
          { id: "note", kind: "text", prompt: "¿Hay algo más que quieras que sepa tu profesional de salud?" },
        ],
      },
      urinary: {
        label: "Vejiga u orina",
        description: "Ardor, urgencia, frecuencia, escapes, cambios en la orina y síntomas relacionados.",
        questions: [
          {
            id: "symptoms", kind: "multi", required: true, prompt: "¿Qué has notado? Elige todo lo que corresponda.", options: [
              { id: "burning", label: "Ardor o dolor al orinar" }, { id: "frequency", label: "Voy más seguido de lo habitual" },
              { id: "urgency", label: "Necesidad repentina o fuerte de ir" }, { id: "little", label: "Sale muy poca orina" },
              { id: "difficulty", label: "Dificultad para comenzar o vaciar" }, { id: "leaking", label: "Escape de orina" },
              { id: "unable", label: "No puedo orinar" }, { id: "other", label: "Otra cosa" },
            ],
          },
          { id: "onset", kind: "single", required: true, prompt: "¿Cuándo comenzó?", options: onsetSpanish },
          {
            id: "urine", kind: "multi", prompt: "¿Has notado un cambio en la orina?", options: [
              { id: "cloudy", label: "Turbia" }, { id: "blood", label: "Rosada, roja o sangre visible" },
              { id: "smell", label: "Olor más fuerte o inusual" }, { id: "dark", label: "Más oscura de lo habitual" },
              { id: "none", label: "No he notado cambios" },
            ],
          },
          {
            id: "related", kind: "multi", prompt: "¿Notas alguna de estas cosas al mismo tiempo?", options: [
              { id: "lowerPain", label: "Molestia en la parte baja del abdomen o pelvis" },
              { id: "backPain", label: "Dolor en la espalda, costado o ingle" },
              { id: "fever", label: "Fiebre o escalofríos" }, { id: "nausea", label: "Náuseas o vómitos" },
              { id: "none", label: "Ninguna de estas" },
            ],
          },
          { id: "severity", kind: "scale", prompt: "¿Cuánto te está afectando esto ahora?" },
          {
            id: "pregnancy", kind: "single", prompt: "¿Es posible un embarazo?", help: "Esto es opcional. Puedes omitirlo o elegir Prefiero no responder.", options: [
              { id: "yes", label: "Sí" }, { id: "no", label: "No" }, { id: "unsure", label: "No estoy seguro/a" },
              { id: "prefer", label: "Prefiero no responder" },
            ],
          },
          { id: "note", kind: "text", prompt: "¿Hay algo más que quieras que sepa tu profesional de salud?" },
        ],
      },
      bowel: {
        label: "Evacuaciones intestinales",
        description: "Frecuencia, forma, urgencia, dolor, sangre y otros cambios.",
        questions: [
          {
            id: "changes", kind: "multi", required: true, prompt: "¿Qué ha cambiado? Elige todo lo que corresponda.", options: [
              { id: "constipation", label: "Duras o difíciles de expulsar" }, { id: "diarrhea", label: "Sueltas o acuosas" },
              { id: "more", label: "Voy más seguido" }, { id: "less", label: "Voy menos seguido" },
              { id: "urgent", label: "Necesidad repentina o urgente de ir" },
              { id: "incomplete", label: "Siento que no salió todo" },
              { id: "leakage", label: "Pérdida de control o escape" }, { id: "other", label: "Otra cosa" },
            ],
          },
          { id: "onset", kind: "single", required: true, prompt: "¿Cuándo comenzó este cambio?", options: onsetSpanish },
          {
            id: "appearance", kind: "multi", prompt: "¿Cómo se veía la evacuación?", options: [
              { id: "hard", label: "Dura, seca o con bolitas" }, { id: "formed", label: "Suave y formada" },
              { id: "loose", label: "Suelta o acuosa" }, { id: "red", label: "Sangre roja" },
              { id: "black", label: "Negra o parecida al alquitrán" }, { id: "mucus", label: "Moco o pus" },
              { id: "unsure", label: "No estoy seguro/a" },
            ],
          },
          {
            id: "frequency", kind: "single", prompt: "¿Qué opción se parece más a lo que está pasando?", options: [
              { id: "noneThree", label: "No he evacuado por 3 días o más" },
              { id: "underThreeWeek", label: "Menos de 3 veces por semana" },
              { id: "oneTwo", label: "Aproximadamente 1–2 al día" },
              { id: "threeFive", label: "3–5 evacuaciones sueltas al día" },
              { id: "sixPlus", label: "6 o más evacuaciones sueltas al día" },
              { id: "different", label: "Es diferente de estas opciones" }, { id: "unsure", label: "No estoy seguro/a" },
            ],
          },
          {
            id: "related", kind: "multi", prompt: "¿Notas alguna de estas cosas al mismo tiempo?", options: [
              { id: "bellyPain", label: "Dolor o cólicos abdominales" }, { id: "rectalPain", label: "Dolor rectal" },
              { id: "noGas", label: "No puedo expulsar gases" }, { id: "vomiting", label: "Vómitos" },
              { id: "fever", label: "Fiebre o escalofríos" }, { id: "dizzy", label: "Mareo o aturdimiento" },
              { id: "none", label: "Ninguna de estas" },
            ],
          },
          { id: "severity", kind: "scale", prompt: "¿Cuánto te está afectando esto ahora?" },
          { id: "note", kind: "text", prompt: "¿Hay algo más que quieras que sepa tu profesional de salud?" },
        ],
      },
      condition: {
        label: "Condición o tratamiento continuo",
        description: "Corazón, respiración, diabetes, cáncer, hormonas/SOP, movilidad, riñón o memoria.",
        questions: [
          {
            id: "conditionArea", kind: "single", required: true,
            prompt: "¿Sobre qué área de salud quieres hacer el registro?",
            help: "Elige el área más cercana. Esto registra lo que notas; no decide si tienes una condición.",
            options: [
              { id: "heart", label: "Corazón o circulación" },
              { id: "breathing", label: "Respiración o condición pulmonar" },
              { id: "diabetes", label: "Diabetes o azúcar en sangre" },
              { id: "cancer", label: "Atención del cáncer o efectos del tratamiento" },
              { id: "hormones", label: "Hormonas, SOP o salud reproductiva" },
              { id: "mobility", label: "Dolor articular, artritis o movilidad" },
              { id: "memory", label: "Memoria, equilibrio, visión o audición" },
              { id: "kidney", label: "Riñón o cambios de líquidos" },
              { id: "other", label: "Otra condición continua" },
            ],
          },
          {
            id: "heartChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "heart" },
            prompt: "¿Qué cambio del corazón o la circulación has notado? Elige todo lo que corresponda.", options: [
              { id: "breath", label: "Falta de aire nueva o peor" },
              { id: "chest", label: "Dolor, presión o pesadez en el pecho" },
              { id: "heartbeat", label: "Latidos rápidos, fuertes o irregulares" },
              { id: "swelling", label: "Hinchazón nueva o peor en pies, tobillos, piernas o abdomen" },
              { id: "fatigue", label: "Cansancio inusual o menor tolerancia a la actividad" },
              { id: "dizzy", label: "Mareo, aturdimiento o desmayo" },
              { id: "weight", label: "Cambio de peso rápido o inesperado" },
              { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "breathingChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "breathing" },
            prompt: "¿Qué cambio respiratorio o pulmonar has notado? Elige todo lo que corresponda.", options: [
              { id: "breath", label: "Falta de aire" }, { id: "cough", label: "Tos nueva o cambiante" },
              { id: "mucus", label: "Más mucosidad o cambio de color" }, { id: "wheeze", label: "Silbidos o respiración ruidosa" },
              { id: "tight", label: "Opresión o pesadez en el pecho" },
              { id: "activity", label: "Menor capacidad para caminar o hacer actividades habituales" },
              { id: "night", label: "Respirar es más difícil de noche o al acostarme" }, { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "diabetesChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "diabetes" },
            prompt: "¿Qué cambio relacionado con el azúcar en sangre has notado?", options: [
              { id: "reading", label: "Lectura de glucosa fuera de mi meta personal" },
              { id: "thirst", label: "Más sed o hambre de lo habitual" }, { id: "urination", label: "Orino con más frecuencia" },
              { id: "low", label: "Temblor, sudor, debilidad, mareo o confusión" },
              { id: "vision", label: "Visión borrosa o cambiante" },
              { id: "numb", label: "Entumecimiento, hormigueo o ardor en manos o pies" },
              { id: "wound", label: "Corte, llaga o herida que sana lentamente" }, { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "cancerChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "cancer" },
            prompt: "¿Qué cambió durante o después de la atención del cáncer?", options: [
              { id: "fatigue", label: "Cansancio o dificultad para hacer actividades habituales" },
              { id: "pain", label: "Dolor nuevo, cambiante o que aparece entre dosis" },
              { id: "nausea", label: "Náuseas o vómitos" },
              { id: "appetite", label: "Cambio al comer, tragar, en el apetito o peso" },
              { id: "bowel", label: "Estreñimiento, diarrea u otro cambio intestinal" },
              { id: "swelling", label: "Hinchazón, moretones, sangrado o cambio de piel" },
              { id: "nerve", label: "Entumecimiento, hormigueo, debilidad o cambio de equilibrio" },
              { id: "fever", label: "Fiebre, escalofríos o síntomas parecidos a la gripe" },
              { id: "sleep", label: "Cambio en sueño, memoria, concentración o ánimo" }, { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "hormoneChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "hormones" },
            prompt: "¿Qué cambio hormonal, de SOP o de salud reproductiva has notado?", options: [
              { id: "cycle", label: "Períodos irregulares, ausentes o cambiantes" },
              { id: "bleeding", label: "Sangrado abundante o manchado" }, { id: "pelvic", label: "Dolor o presión pélvica" },
              { id: "hair", label: "Nuevo vello facial/corporal o caída del cabello" },
              { id: "skin", label: "Acné, piel grasa o manchas más oscuras/gruesas" },
              { id: "weight", label: "Cambio de peso, apetito o energía" },
              { id: "fertility", label: "Preocupación de fertilidad, embarazo o salud sexual" }, { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "mobilityChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "mobility" },
            prompt: "¿Qué cambio articular o de movilidad has notado?", options: [
              { id: "pain", label: "Dolor articular o muscular" }, { id: "stiff", label: "Rigidez o menor movimiento" },
              { id: "swelling", label: "Hinchazón, calor o enrojecimiento articular" },
              { id: "weak", label: "Debilidad o cansancio inusual" },
              { id: "walking", label: "Más dificultad para pararme, caminar o usar escaleras" },
              { id: "daily", label: "Más dificultad con tareas diarias habituales" },
              { id: "fall", label: "Caída, casi caída o nuevo temor a caer" }, { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "memoryChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "memory" },
            prompt: "¿Qué cambio has notado? Elige todo lo que corresponda.", options: [
              { id: "forget", label: "Más olvidos de lo habitual" },
              { id: "confused", label: "Confusión o dificultad con pasos conocidos" },
              { id: "words", label: "Dificultad para encontrar palabras o seguir conversaciones" },
              { id: "tasks", label: "Dificultad con medicinas, citas, dinero o traslados" },
              { id: "balance", label: "Mareo, problema de equilibrio, caída o casi caída" },
              { id: "vision", label: "Cambio en la visión" }, { id: "hearing", label: "Cambio en la audición" },
              { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "kidneyChanges", kind: "multi", required: true, showWhen: { id: "conditionArea", equals: "kidney" },
            prompt: "¿Qué cambio renal o de líquidos has notado?", options: [
              { id: "swelling", label: "Hinchazón en pies, tobillos, piernas, manos, cara o abdomen" },
              { id: "urine", label: "Cambio en cantidad, color, espuma o sangre en la orina" },
              { id: "frequency", label: "Cambio en la frecuencia de orinar" },
              { id: "pain", label: "Dolor de espalda, costado o ingle" },
              { id: "fatigue", label: "Cansancio, debilidad, náuseas o cambio de apetito" },
              { id: "breath", label: "Falta de aire" }, { id: "pressure", label: "Cambio en la presión arterial" },
              { id: "other", label: "Otra cosa" },
            ],
          },
          {
            id: "otherChanges", kind: "text", required: true, showWhen: { id: "conditionArea", equals: "other" },
            prompt: "¿Qué cambió con tu condición o tratamiento?",
          },
          { id: "onset", kind: "single", required: true, prompt: "¿Cuándo comenzó este cambio?", options: onsetSpanish },
          {
            id: "context", kind: "multi", prompt: "¿Qué ocurría alrededor de este cambio?", options: [
              { id: "newMedicine", label: "Comencé o cambié una medicina o dosis" },
              { id: "missedMedicine", label: "Omití o no pude tomar una medicina" },
              { id: "treatment", label: "Ocurrió durante o después de un tratamiento o procedimiento" },
              { id: "activity", label: "Cambia con actividad, comidas, sueño u hora del día" },
              { id: "noChange", label: "No conozco ningún cambio de tratamiento o rutina" },
              { id: "unsure", label: "No estoy seguro/a" }, { id: "prefer", label: "Prefiero no responder" },
            ],
          },
          { id: "severity", kind: "scale", prompt: "¿Cuánto está afectando tu día habitual ahora?" },
          { id: "measurements", kind: "text", prompt: "¿Quieres incluir una medición?", help: "Ejemplos opcionales: presión arterial, pulso, peso, temperatura, oxígeno o glucosa; incluye el número, unidad, fecha y si proviene de un dispositivo." },
          { id: "note", kind: "text", prompt: "¿Hay algo más que quieras que sepa tu profesional de salud?" },
        ],
      },
    },
  },
};

export function hasGuidedAnswer(value: GuidedAnswer): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return typeof value === "number";
}

function optionLabel(question: GuidedQuestion, id: string) {
  return question.options?.find((option) => option.id === id)?.label ?? id;
}

export function displayGuidedAnswer(
  question: GuidedQuestion,
  value: GuidedAnswer,
): string {
  if (!hasGuidedAnswer(value)) return "";
  if (typeof value === "number") return `${value} out of 10`;
  if (Array.isArray(value)) return value.map((item) => optionLabel(question, item)).join(", ");
  if (typeof value !== "string") return "";
  if (question.kind === "single") return optionLabel(question, value);
  return value;
}

const CATEGORY_FOR_TOPIC: Record<Exclude<GuidedTopic, "condition">, Category> = {
  cycle: "cycle",
  urinary: "urinary",
  bowel: "bowel",
};

const CONDITION_CATEGORY: Record<string, Category> = {
  heart: "other",
  breathing: "illness",
  diabetes: "other",
  cancer: "other",
  hormones: "cycle",
  mobility: "pain",
  memory: "other",
  kidney: "urinary",
  other: "other",
};

const CONDITION_LABELS: Record<string, string> = {
  heart: "Heart or circulation change",
  breathing: "Breathing or lung change",
  diabetes: "Blood sugar or diabetes change",
  cancer: "Cancer care or treatment change",
  hormones: "Hormone, PCOS, or reproductive-health change",
  mobility: "Joint or mobility change",
  memory: "Memory, balance, vision, or hearing change",
  kidney: "Kidney or fluid change",
  other: "Ongoing condition or treatment change",
};

const CYCLE_LABELS: Record<string, string> = {
  period: "Menstrual bleeding",
  between: "Bleeding between periods",
  late: "Missed or late period",
  afterSex: "Bleeding after sex",
  other: "Cycle change",
};

export function buildGuidedDraft(
  topic: GuidedTopic,
  answers: GuidedAnswers,
  language: GuidedLanguage,
): DraftEvent {
  const localized = GUIDED_COPY[language].topics[topic];
  const canonical = GUIDED_COPY.en.topics[topic];
  const localizedLines: string[] = [];
  const canonicalLines: string[] = [];

  localized.questions.forEach((question, index) => {
    const value = answers[question.id];
    if (!hasGuidedAnswer(value)) return;
    const localizedAnswer = displayGuidedAnswer(question, value);
    const canonicalQuestion = canonical.questions[index];
    const canonicalAnswer = displayGuidedAnswer(canonicalQuestion, value);
    localizedLines.push(`${question.prompt} ${localizedAnswer}`);
    canonicalLines.push(`${canonicalQuestion.prompt} ${canonicalAnswer}`);
  });

  const date = typeof answers.startDate === "string" ? answers.startDate : null;
  const onsetQuestion = canonical.questions.find((question) => question.id === "onset");
  const onset = date || (onsetQuestion ? displayGuidedAnswer(onsetQuestion, answers.onset) : null) || null;
  const severity = typeof answers.severity === "number" ? answers.severity : null;
  const recordType = typeof answers.recordType === "string" ? answers.recordType : "";
  const conditionArea = typeof answers.conditionArea === "string" ? answers.conditionArea : "other";
  const label = topic === "cycle"
    ? CYCLE_LABELS[recordType] ?? "Period or cycle change"
    : topic === "urinary"
      ? "Urinary or bladder change"
      : topic === "bowel"
        ? "Bowel movement change"
        : CONDITION_LABELS[conditionArea] ?? CONDITION_LABELS.other;
  const category = topic === "condition"
    ? CONDITION_CATEGORY[conditionArea] ?? "other"
    : CATEGORY_FOR_TOPIC[topic];

  return DraftEvent.parse({
    category,
    label,
    severity,
    bodyLocation: null,
    onset,
    pattern: null,
    trendHint: null,
    durationMinutes: null,
    occurredAt: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
    originalInput: localizedLines.join("\n"),
    inputLanguage: language,
    translation: null,
    note: canonicalLines.join("\n") || null,
    cycleDay: null,
    cyclePhase: null,
  });
}
