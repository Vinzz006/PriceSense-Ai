import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  language: string;
  onSelect: (question: string) => void;
}

const QUESTIONS_BY_LANG: Record<string, string[]> = {
  en: [
    "What is the current wheat price in Kanpur?",
    "Forecast wheat prices for the next 7 days",
    "Compare onion prices across different mandis",
    "How does the Chronos-Bolt model forecast prices?",
    "What agricultural data is currently loaded?",
  ],
  hi: [
    "कानपुर में गेहूं का ताजा भाव क्या है?",
    "अगले 7 दिनों का गेहूं मूल्य पूर्वानुमान बताओ।",
    "विभिन्न मंडियों में प्याज के भाव की तुलना करो।",
    "डेटासेट में कौन-कौन सी फसलें उपलब्ध हैं?",
  ],
  ta: [
    "கோதுமையின் தற்போதைய சந்தை விலை என்ன?",
    "அடுத்த 7 நாட்களுக்கான விலை முன்னறிவிப்பைக் காட்டு.",
    "வெங்காயத்தின் சந்தை விலைகளை ஒப்பிடு.",
    "தற்போதைய தரவுத்தொகுப்பு விவரங்கள் என்ன?",
  ],
  te: [
    "గోధుమల ప్రస్తుత మార్కెట్ ధర ఎంత?",
    "వచ్చే 7 రోజుల గోధుమ ధరల అంచనా ఏమిటి?",
    "వివిధ మార్కెట్లలో ఉల్లిపాయ ధరలను పోల్చండి.",
  ],
  kn: [
    "ಗೋಧಿಯ ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ದರ ಎಷ್ಟು?",
    "ಮುಂದಿನ 7 ದಿನಗಳ ಬೆಲೆ ಮುನ್ಸೂಚನೆ ತಿಳಿಸಿ.",
  ],
  ml: [
    "ഗോതമ്പിന്റെ ഇപ്പോഴത്തെ വിപണി വില എത്രയാണ്?",
    "അടുത്ത 7 ദിവസത്തെ വില പ്രവചനം പറയൂ.",
  ],
  bn: [
    "গমের বর্তমান পাইকারি দর কত?",
    "আগামী ৭ দিনের গমের দামের পূর্বাভাস দিন।",
  ],
  mr: [
    "गव्हाचा आजचा चालू बाजारभाव काय आहे?",
    "पुढील ७ दिवसांचा भाव अंदाज सांगा.",
  ],
  gu: [
    "ઘઉંનો વર્તમાન બજારભાવ શું છે?",
    "આગામી 7 દિવસનો ભાવ અનુમાન દર્શાવો.",
  ],
  pa: [
    "ਕਣਕ ਦਾ ਅੱਜ ਦਾ ਮੰਡੀ ਭਾਅ ਕੀ ਹੈ?",
    "ਅਗਲੇ 7 ਦਿਨਾਂ ਦਾ ਮੁੱਲ ਪੂਰਵ-ਅਨੁਮਾਨ ਦੱਸੋ।",
  ],
  ur: [
    "گندم کی موجودہ منڈی کی قیمت کیا ہے؟",
    "اگلے 7 دنوں کے لیے قیمت کی پیش گوئی بتائیں۔",
  ]
};

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ language, onSelect }) => {
  const list = QUESTIONS_BY_LANG[language] || QUESTIONS_BY_LANG.en;

  return (
    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Quick Questions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q)}
            className="text-xs bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-slate-200 border border-emerald-200 dark:border-emerald-800/60 rounded-full px-3 py-1 text-left transition-colors shadow-xs"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

