"use client";

import { useEffect, useRef } from 'react';
import styles from '../marcos.module.css';
import { Milestone, countdown, dateLabel, daysBetween, kindOf, monthLabel, parseDate, rangeOf } from '../types';

interface Props {
  milestones: Milestone[];
  start: Date;
  months: number;
  today: Date;
  onEdit: (m: Milestone) => void;
}

const PAD = 40;
const LABEL_W = 170;
const LANE_H = 58;
const LANES = 3; // por lado (acima e abaixo do eixo)

// Linha horizontal: rótulos alternam acima/abaixo em faixas para não se sobreporem.
export default function HorizontalTimeline({ milestones, start, months, today, onEdit }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const { from, monthStarts, totalDays } = rangeOf(start, months);
  const px = months <= 3 ? 12 : months <= 6 ? 7 : 4;
  const x = (d: Date) => PAD + daysBetween(from, d) * px;
  const width = PAD * 2 + totalDays * px + LABEL_W;
  const axisY = LANES * LANE_H + 20;
  const height = axisY * 2;

  const laneEnds = Array(LANES * 2).fill(-Infinity);
  const placed = [...milestones]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => {
      const anchor = x(parseDate(m.date));
      // Ordem de tentativa: acima 1, abaixo 1, acima 2, abaixo 2...
      let lane = laneEnds.findIndex(end => end + 10 < anchor);
      if (lane === -1) lane = laneEnds.indexOf(Math.min(...laneEnds));
      laneEnds[lane] = anchor + LABEL_W;
      const above = lane % 2 === 0;
      const depth = Math.floor(lane / 2) + 1;
      const top = above ? axisY - depth * LANE_H : axisY + (depth - 1) * LANE_H + 18;
      return { m, anchor, above, top };
    });

  const ticks = monthStarts.slice(0, -1).flatMap(d => [
    new Date(d.getFullYear(), d.getMonth(), 15, 12),
    new Date(d.getFullYear(), d.getMonth() + 1, 0, 12),
  ]);

  const todayInRange = today >= from && daysBetween(from, today) <= totalDays;

  // Abre já rolado até hoje.
  useEffect(() => {
    if (todayInRange && scroller.current) scroller.current.scrollLeft = Math.max(0, x(today) - 120);
  }, [start, months]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.hScroller} ref={scroller}>
      <div className={styles.hWrap} style={{ width, height }}>
        <div className={styles.hAxis} style={{ top: axisY, left: PAD, width: totalDays * px }} />

        {ticks.map(d => (
          <div key={d.toISOString()} className={styles.hTick} style={{ left: x(d), top: axisY }}>
            <span>{d.getDate()}</span>
          </div>
        ))}

        {monthStarts.map(d => (
          <div key={d.toISOString()}>
            <div className={styles.hMonthDot} style={{ left: x(d), top: axisY }} />
            <div className={styles.hMonthLabel} style={{ left: x(d), top: axisY + 16 }}>{monthLabel(d)}</div>
          </div>
        ))}

        {todayInRange && (
          <div className={styles.hToday} style={{ left: x(today), height }}>
            <span>hoje</span>
          </div>
        )}

        {placed.map(({ m, anchor, above, top }) => {
          const color = kindOf(m.kind).color;
          const stemTop = above ? top + 44 : axisY;
          const stemBottom = above ? axisY : top;
          return (
            <div key={m.id}>
              <div className={styles.hStem} style={{ left: anchor, top: stemTop, height: Math.max(0, stemBottom - stemTop) }} />
              <div
                className={`${styles.hDiamond} ${m.done ? styles.diamondDone : ''}`}
                style={{ left: anchor, top: axisY, borderColor: color, background: m.done ? color : undefined }}
              />
              <button className={styles.hLabel} style={{ left: anchor - 8, top, width: LABEL_W, borderLeftColor: color }} onClick={() => onEdit(m)}>
                <span className={`${styles.mTitle} ${m.done ? styles.mDone : ''}`}>{m.title}</span>
                <span className={styles.mMeta}>
                  <span style={{ color }}>{dateLabel(m)}</span> · {countdown(m, today)}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
