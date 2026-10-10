"use client";

import styles from '../marcos.module.css';
import { Milestone, countdown, dateLabel, daysBetween, kindOf, monthLabel, parseDate, rangeOf } from '../types';

interface Props {
  milestones: Milestone[];
  start: Date;
  months: number;
  today: Date;
  onEdit: (m: Milestone) => void;
}

const TOP = 24;
const MONTH_LABEL_H = 34;
const MILESTONE_LABEL_H = 46;

// Linha vertical como no caderno: mês = bolinha, dias 15 e último = risquinho, marco = losango.
export default function VerticalTimeline({ milestones, start, months, today, onEdit }: Props) {
  const { from, monthStarts, totalDays } = rangeOf(start, months);
  // Escala por dia: períodos longos ficam mais compactos.
  const px = months <= 3 ? 9 : months <= 6 ? 5 : 2.8;
  const y = (d: Date) => TOP + daysBetween(from, d) * px;
  const height = TOP * 2 + totalDays * px;

  // Nome do mês fica sempre colado à bolinha; os rótulos dos marcos desviam dele e uns dos
  // outros (ex.: 31/10 e 01/11). O losango continua na data exata; um tracejado liga os dois.
  const monthBoxes = monthStarts.map(d => {
    const top = y(d) - MONTH_LABEL_H / 2;
    return { d, top, bottom: top + MONTH_LABEL_H };
  });

  // Cada mês é um trecho entre o nome dele e o nome do próximo. Os rótulos de um mês nunca
  // saem do trecho: descem para não se sobrepor e, se passarem do fim, sobem juntos.
  const placed: { m: Milestone; anchor: number; top: number }[] = [];
  monthBoxes.forEach((box, i) => {
    const next = monthBoxes[i + 1];
    const segStart = box.bottom + 4;
    const segEnd = next ? next.top - 4 : Infinity;
    const items = milestones
      .filter(m => {
        const a = y(parseDate(m.date));
        return a >= y(box.d) && (!next || a < y(next.d));
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({ m, anchor: y(parseDate(m.date)), top: 0 }));

    let prevBottom = segStart - 6;
    for (const it of items) {
      it.top = Math.max(it.anchor - MILESTONE_LABEL_H / 2, prevBottom + 6, segStart);
      prevBottom = it.top + MILESTONE_LABEL_H;
    }
    for (let j = items.length - 1; j >= 0; j--) {
      const limit = j === items.length - 1 ? segEnd - MILESTONE_LABEL_H : items[j + 1].top - 6 - MILESTONE_LABEL_H;
      items[j].top = Math.max(segStart, Math.min(items[j].top, limit));
    }
    placed.push(...items);
  });
  const lastBottom = placed.reduce((max, p) => Math.max(max, p.top + MILESTONE_LABEL_H), 0);
  const fullHeight = Math.max(height, lastBottom + TOP);

  const ticks = monthStarts.slice(0, -1).flatMap(d => {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
    return [new Date(d.getFullYear(), d.getMonth(), 15, 12), last];
  });

  const todayInRange = today >= from && daysBetween(from, today) <= totalDays;

  return (
    <div className={styles.vWrap} style={{ height: fullHeight }}>
      <div className={styles.vAxis} style={{ top: TOP, height: totalDays * px }} />

      {ticks.map(d => (
        <div key={d.toISOString()} className={styles.vTick} style={{ top: y(d) }}>
          <span>{d.getDate()}</span>
        </div>
      ))}

      {todayInRange && (
        <div className={styles.vToday} style={{ top: y(today) }}>
          <span>hoje</span>
        </div>
      )}

      {monthBoxes.map(box => (
        <div key={box.d.toISOString()}>
          <div className={styles.vMonthDot} style={{ top: y(box.d) }} />
          <div className={styles.vMonthLabel} style={{ top: box.top }}>{monthLabel(box.d)}</div>
        </div>
      ))}

      {placed.map(({ m, anchor, top }) => {
        const color = kindOf(m.kind).color;
        const labelCenter = top + MILESTONE_LABEL_H / 2;
        return (
          <div key={m.id}>
            <div
              className={`${styles.vDiamond} ${m.done ? styles.diamondDone : ''}`}
              style={{ top: anchor, borderColor: color, background: m.done ? color : undefined }}
            />
            {Math.abs(labelCenter - anchor) > 4 && (
              <div
                className={styles.vConnector}
                style={{ top: Math.min(anchor, labelCenter), height: Math.abs(labelCenter - anchor) }}
              />
            )}
            <button className={styles.vLabel} style={{ top }} onClick={() => onEdit(m)}>
              <span className={`${styles.mTitle} ${m.done ? styles.mDone : ''}`}>{m.title}</span>
              <span className={styles.mMeta}>
                <span style={{ color }}>{dateLabel(m)}</span> · {countdown(m, today)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
