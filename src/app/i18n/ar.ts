import type { Messages } from './en';

export const ar: Messages = {
  appName: 'مساعد الزكاة',
  notAFatwa: 'هذه حاسبة وليست فتوى.',
  lineReason: {
    counted: 'محسوب',
    'long-term-fraction': 'أسهم طويلة الأجل: يُحسب الجزء الزكوي فقط',
    'jewellery-exempt': 'غير محسوب: حلي تلبسها',
    'company-pays': 'غير محسوب: الشركة تزكي عنك',
    'not-for-sale': 'غير محسوب: ليس معروضًا للبيع',
    'doubtful-debt': 'غير محسوب حتى تستلمه',
    'not-zakatable-by-user': 'غير محسوب: اخترت عدم احتسابه',
    'deducted-debt': 'مخصوم: يستحق خلال 12 شهرًا',
    'debt-not-deducted': 'غير مخصوم: الديون لا تنقص الزكاة حسب إعداداتك',
  },
  warning: {
    'gap-too-long': 'مضى أكثر من عام على تاريخ زكاتك الأخير. أضف العام الناقص أولًا إن كنت تخطيته.',
    'gap-too-short': 'لم يمضِ عام كامل على تاريخ زكاتك الأخير.',
  },
  nothingDue: {
    'below-nisab': 'لا زكاة عليك: مجموع أموالك دون النصاب.',
    'no-nisab-at-previous':
      'لا زكاة عليك بعد: لم تملك النصاب في تاريخ زكاتك الأخير، فيبدأ حولك الآن.',
    'dipped-below-nisab':
      'لا زكاة عليك: نزل مجموع أموالك دون النصاب خلال العام، فيبدأ حولك من جديد.',
  },
  missing: {
    'holding-price': (name: string) => `أدخل سعر أو قيمة ${name} اليوم.`,
    fx: (currency: string) => `أدخل سعر صرف ${currency} اليوم.`,
    'metal-price': (metal: 'gold' | 'silver') =>
      `أدخل سعر غرام ${metal === 'gold' ? 'الذهب' : 'الفضة'} الخالص اليوم.`,
    'first-year-answer': 'أجب: هل كنت تملك النصاب في تاريخ زكاتك الأخير؟',
  },
};
