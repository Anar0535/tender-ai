export const PLANS = {
  business: {
    price: 69000,
    credits: 10,
    description: "TenderAI Business - 30 хоног (10 шинжилгээ)",
  },
  enterprise: {
    price: 169000,
    credits: 0,
    description: "TenderAI Enterprise - 30 хоног (хязгааргүй)",
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Дуусахаас хэдэн хоногийн өмнөөс сунгах боломжтой вэ
export const RENEW_WINDOW_DAYS = 7;