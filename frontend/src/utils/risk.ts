// src/utils/risk.ts
export type Risk = {
  score: number;              // 0-100
  level: "low" | "medium" | "high";
  reasons: string[];
};

const clamp = (x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));

/** approx CDF ¢Í§ normal */
export function normalCdf(z:number){
  // Abramowitz-Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
  let p = d * t * (0.31938153 + t*(-0.356563782 + t*(1.781477937 + t*(-1.821255978 + t*1.330274429))));
  if (z > 0) p = 1 - p;
  return p;
}

/** ¤ÇÒÁ¹èÒ¨Ðà»ç¹ËÅØ´Êà»¡ ¨Ò¡ ?,? áÅÐ LSL/USL (ÃÍ§ÃÑºÁÕ¢éÒ§à´ÕÂÇ) */
export function probOutOfSpec(mu:number|null, sigma:number|null, lsl:number|null|undefined, usl:number|null|undefined){
  if (mu==null || sigma==null || !Number.isFinite(mu) || !Number.isFinite(sigma) || sigma<=0) return null;
  let p=0;
  if (lsl!=null && Number.isFinite(lsl)) p += normalCdf((lsl-mu)/sigma);            // left tail
  if (usl!=null && Number.isFinite(usl)) p += 1 - normalCdf((usl-mu)/sigma);        // right tail
  return p; // 0..1
}

/** ¤ÇÒÁªÑ¹àªÔ§àÊé¹áºº§èÒÂ æ */
function slope(series:(number|null)[]){
  const pts = series.map((y,i)=>[i,y] as const).filter(([,y])=>typeof y==="number") as [number,number][];
  if (pts.length<2) return 0;
  const n=pts.length;
  const sx=pts.reduce((s,[x])=>s+x,0);
  const sy=pts.reduce((s,[,y])=>s+y,0);
  const sxx=pts.reduce((s,[x])=>s+x*x,0);
  const sxy=pts.reduce((s,[x,y])=>s+x*y,0);
  const den = n*sxx - sx*sx;
  if (den===0) return 0;
  return (n*sxy - sx*sy)/den;
}

/** ÃÒÂÅÐàÍÕÂ´¡ÒÃãËé¤Ðá¹¹ (äÇé debug) */
export type RiskDetail = Risk & {
  components: {
    cpk: number;        // ¤Ðá¹¹¨Ò¡ Cpk
    oos: number;        // ¤Ðá¹¹¨Ò¡ p(out-of-spec)
    sigmaMax: number;   // ¤Ðá¹¹¨Ò¡ ? à¡Ô¹à¾´Ò¹
    trendCpk: number;   // ¤Ðá¹¹¨Ò¡á¹Çâ¹éÁ Cpk áÂèÅ§
    trendSigma: number; // ¤Ðá¹¹¨Ò¡á¹Çâ¹éÁ ? à¾ÔèÁ¢Öé¹
  };
  pOut: number|null;    // ¤ÇÒÁ¹èÒ¨Ðà»ç¹ OOS (0..1) ¶éÒ¤Ó¹Ç³ä´é
  slopes: { cpk: number; sigma: number };
};

// utils/risk.ts
export function assessRisk(opts: {
  cpk?: number | null;
  mu?: number | null;
  sigma?: number | null;
  lsl?: number | null | undefined;
  usl?: number | null | undefined;
  sigmaMax?: number | null;
  cpkSeries?: (number | null)[];
  sigmaSeries?: (number | null)[];
}): Risk {
  const reasons: string[] = [];
  let score = 0;

  // normalize cpk
  const cpk =
    typeof opts.cpk === "number" && isFinite(opts.cpk) ? (opts.cpk as number) : null;

  // ? HARD RULE: Cpk < 1.00 => HIGH ·Ñ¹·Õ
  if (cpk !== null && cpk < 1) {
    reasons.push(`Hard rule: Cpk ${cpk.toFixed(3)} < 1.00`);
    return { score: 90, level: "high", reasons };
  }

  // —— ¤Ðá¹¹¨Ò¡ Cpk (àÁ×èÍäÁèµÔ´ hard rule) ——
  if (cpk === null) {
    score += 10;
    reasons.push("No Cpk value");
  } else if (cpk < 1.33) {
    score += 35;
    reasons.push(`Low Cpk: ${cpk.toFixed(3)} (< 1.33)`);
  } else if (cpk < 1.67) {
    score += 15;
    reasons.push(`Moderate Cpk: ${cpk.toFixed(3)} (< 1.67)`);
  }

  // 2) Probability of out-of-spec (OOS)
  const pOut = probOutOfSpec(
    opts.mu ?? null,
    opts.sigma ?? null,
    opts.lsl ?? null,
    opts.usl ?? null
  );
  if (pOut != null) {
    const add = clamp(Math.round(200 * pOut), 0, 50);
    if (add > 0) reasons.push(`Estimated out-of-spec ${ (pOut * 100).toFixed(2) }%`);
    score += add;
  } else {
    reasons.push("Cannot compute OOS probability (data no limit usl lsl)");
    score += 5;
  }

  // 3) Sigma ceiling
  if (
    opts.sigmaMax != null &&
    isFinite(opts.sigmaMax as number) &&
    opts.sigma != null &&
    isFinite(opts.sigma as number)
  ) {
    if ((opts.sigma as number) > (opts.sigmaMax as number)) {
      score += 25;
      reasons.push(
        `above ceiling (${(opts.sigma as number).toFixed(3)} > ${opts.sigmaMax})`
      );
    }
  }

  // 4) Trends
  const sC = slope(opts.cpkSeries ?? []);
  const sS = slope(opts.sigmaSeries ?? []);
  if (sC < -0.02) {
    score += 10;
    reasons.push("Cpk downtrend");
  }
  if (sS > 0.02) {
    score += 10;
    reasons.push("uptrend");
  }

  // Base level from score
  score = clamp(score, 0, 100);
  let level: Risk["level"] = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  // ?? Floor protections (¡Ñ¹ËÅØ´ LOW ¼Ô´¤ÇÒÁ¤Ò´ËÁÒÂ)
  if (cpk !== null && cpk < 1.33 && level === "low") level = "medium";
  if (
    opts.sigmaMax != null &&
    opts.sigma != null &&
    isFinite(opts.sigmaMax as number) &&
    isFinite(opts.sigma as number) &&
    (opts.sigma as number) > (opts.sigmaMax as number) &&
    level === "low"
  ) {
    level = "medium";
  }

  return { score, level, reasons };
}
