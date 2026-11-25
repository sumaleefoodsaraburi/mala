import { useState } from 'react';
import { Banknote, Landmark, LogIn, TrendingUp, Utensils } from 'lucide-react';

interface SignInViewProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  authError: string | null;
}

export function SignInView({ onSignIn, isSigningIn, authError }: SignInViewProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 lg:py-16">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left copy & sign-in action */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="text-xs font-medium text-red-700 tracking-wide">
              ระบบบัญชีหน้าร้าน · หลังเกษราษฎร์
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 leading-tight text-balance">
              บันทึกรายการขาย ซื้อวัตถุดิบ และกำไรขาดทุนร้านหมาล่าทอด
            </h1>

            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              ออกแบบมาสำหรับหน้าร้านโดยเฉพาะ คีย์ยอดขายและรายการซื้อของได้รวดเร็ว แยกยอดรับ-จ่ายระหว่างเงินสดและบัญชีธนาคารกรุงไทย พร้อมสรุปกำไรขาดทุนรายวันและรายเดือนแบบเรียลไทม์
            </p>

            <ul className="space-y-4 pt-2 border-t border-slate-100">
              <li className="flex items-start gap-3">
                <Banknote className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    แยกยอดขายเงินสด และโอนเข้ากรุงไทยชัดเจน
                  </div>
                  <div className="text-sm text-slate-600">
                    รองรับทั้งการคีย์ยอดขายแยกส่วนเงินสดกับยอดโอนในบิลเดียว หรือสรุปยอดขายประจำวัน
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Landmark className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    บันทึกรายการซื้อของพร้อมเลือกช่องทางจ่าย
                  </div>
                  <div className="text-sm text-slate-600">
                    ระบุได้ทันทีว่าจ่ายค่าวัตถุดิบหรือค่าใช้จ่ายร้านด้วยเงินสดหรือธนาคารกรุงไทย
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    คำนวณกำไรขาดทุนและยอดคงเหลืออัตโนมัติ
                  </div>
                  <div className="text-sm text-slate-600">
                    ดูผลกำไรสุทธิแยกตามช่วงเวลา พร้อมยอดเงินสดในเก๊ะและยอดบัญชีกรุงไทยที่ควรมี
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-4">
            {authError && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
              >
                {authError}
              </div>
            )}
            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>{isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google เพื่อเริ่มบันทึก'}</span>
            </button>
            <p className="text-xs text-slate-500">
              ข้อมูลทุกยอดขายและรายการซื้อของจะถูกจัดเก็บอย่างปลอดภัยในบัญชีร้านของคุณ
            </p>
          </div>
        </div>

        {/* Right photograph */}
        <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-full bg-slate-900">
          {!imgFailed ? (
            <img
              src="/src/assets/images/mala_skewers_shop_1795538856513.jpg"
              alt="หมาล่าทอดเสียบไม้ ร้านหมาล่าทอด หลังเกษราษฎร์"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white gap-3">
              <Utensils className="w-12 h-12 text-red-400" />
              <span className="font-display text-xl font-semibold">ร้านหมาล่าทอด หลังเกษราษฎร์</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="text-xs text-slate-200">
              หลังเกษราษฎร์ · บัญชีรายรับรายจ่ายประจำร้าน
            </div>
            <div className="font-display text-lg font-semibold mt-0.5">
              เช็กยอดขาย เงินสด กรุงไทย และกำไรสุทธิได้ทุกวัน
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
