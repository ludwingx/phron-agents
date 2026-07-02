// ─── Type definitions ──────────────────────────────────────────

export interface DaySchedule {
  open: string
  close: string
  enabled: boolean
}

export interface ShippingZone {
  label: string
  minKm: number
  maxKm: number
  cost: number
}

export interface BankTransfer {
  enabled: boolean
  bankName: string
  accountNumber: string
  accountHolder: string
  idNumber: string
  accountType: string
}

export interface SalesConfig {
  // 📍 Ubicación del negocio
  businessAddress: string
  businessLatitude: number | null
  businessLongitude: number | null

  // 🕒 Horarios de atención
  timezone: string
  businessHours: {
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule
  }
  offHoursMessage: string

  // 🚚 Envíos por distancia
  shippingEnabled: boolean
  shippingZones: ShippingZone[]
  shippingFreeAbove: number | null
  outOfRangeMessage: string

  // 💳 Métodos de pago
  paymentQrUrl: string
  paymentQrLabel: string
  bankTransfer: BankTransfer

  // 🛒 Reservas
  reservationEnabled: boolean
  reservationPercentage: number
  reservationExpiryHours: number

  // 🎭 Personalidad del agente
  personalityPreset: "friendly" | "urgent" | "formal" | "custom"

  // 🤝 Traspaso a humano
  humanHandoffEnabled: boolean
  humanHandoffKeywords: string[]
}

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULT_DAY: DaySchedule = { open: "09:00", close: "18:00", enabled: true }
const DEFAULT_DAY_OFF: DaySchedule = { open: "09:00", close: "18:00", enabled: false }

export const DEFAULT_SALES_CONFIG: SalesConfig = {
  businessAddress: "",
  businessLatitude: null,
  businessLongitude: null,

  timezone: "America/La_Paz",
  businessHours: {
    monday: { ...DEFAULT_DAY },
    tuesday: { ...DEFAULT_DAY },
    wednesday: { ...DEFAULT_DAY },
    thursday: { ...DEFAULT_DAY },
    friday: { ...DEFAULT_DAY },
    saturday: { ...DEFAULT_DAY },
    sunday: { ...DEFAULT_DAY_OFF },
  },
  offHoursMessage:
    "¡Hola! 🌙 En este momento estamos fuera de nuestro horario de atención. Déjanos tu mensaje y mañana a primera hora te respondemos. ¡Gracias por tu interés!",

  shippingEnabled: false,
  shippingZones: [
    { label: "Zona Centro", minKm: 0, maxKm: 5, cost: 10 },
    { label: "Zona Intermedia", minKm: 5, maxKm: 15, cost: 20 },
    { label: "Zona Lejana", minKm: 15, maxKm: 30, cost: 35 },
  ],
  shippingFreeAbove: null,
  outOfRangeMessage:
    "Lamentablemente tu ubicación está fuera de nuestra zona de delivery. Te invitamos a visitarnos en nuestra tienda física o coordinar un envío por courier.",

  paymentQrUrl: "",
  paymentQrLabel: "Escanea para pagar",
  bankTransfer: {
    enabled: false,
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    idNumber: "",
    accountType: "Caja de Ahorros",
  },

  reservationEnabled: false,
  reservationPercentage: 20,
  reservationExpiryHours: 24,

  personalityPreset: "friendly",

  humanHandoffEnabled: true,
  humanHandoffKeywords: ["hablar con alguien", "humano", "reclamo", "queja", "persona real"],
}
