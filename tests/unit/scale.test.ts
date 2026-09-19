import { describe, expect, it } from 'vitest';

import { heatOpacity, labelIndices, linePath, percent, scale, ticks } from '@/charts/scale';

describe('scale', () => {
  it('maps linearly and inverts the y axis when the range is reversed', () => {
    const y = { domain: [0, 100] as const, range: [180, 20] as const };
    expect(scale(y, 0)).toBe(180);
    expect(scale(y, 100)).toBe(20);
    expect(scale(y, 25)).toBe(140);
  });

  it('a flat domain maps to the start of the range instead of dividing by zero', () => {
    expect(scale({ domain: [5, 5], range: [0, 100] }, 5)).toBe(0);
  });
});

describe('ticks', () => {
  it('picks 1-2-5 steps and always covers the maximum', () => {
    expect(ticks(7)).toEqual([0, 2, 4, 6, 8]); // rough 1.75 -> step 2
    expect(ticks(23)).toEqual([0, 10, 20, 30]); // rough 5.75 -> residual above 5 -> step 10
    expect(ticks(100)).toEqual([0, 50, 100]); // rough 25 -> magnitude 10, residual 2.5 -> step 50
    expect(ticks(1300)).toEqual([0, 500, 1000, 1500]); // rough 325 -> magnitude 100, residual 3.25 -> step 500
  });

  it('handles zero and tiny maxima', () => {
    expect(ticks(0)).toEqual([0, 1]);
    expect(ticks(1)).toEqual([0, 0.5, 1]); // rough 0.25 -> magnitude 0.1, residual 2.5 -> step 0.5
  });
});

describe('linePath', () => {
  it('emits M then L segments with at most two decimals', () => {
    expect(linePath([])).toBe('');
    expect(linePath([[0, 10]])).toBe('M0 10');
    expect(
      linePath([
        [0, 10],
        [33.333, 5.5],
        [100, 0],
      ]),
    ).toBe('M0 10L33.33 5.50L100 0');
  });
});

describe('labelIndices', () => {
  it('keeps everything when it fits, otherwise strides and keeps both ends', () => {
    expect(labelIndices(5, 8)).toEqual([0, 1, 2, 3, 4]);
    expect(labelIndices(30, 6)).toEqual([0, 6, 12, 18, 24, 29]);
    expect(labelIndices(31, 7)).toEqual([0, 5, 10, 15, 20, 25, 30]);
  });
});

describe('heatOpacity and percent', () => {
  it('quantises retention ratios and formats percentages', () => {
    expect([0, 0.1, 0.25, 0.6, 1].map(heatOpacity)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(percent(0.4)).toBe('40%');
    expect(percent(0.333)).toBe('33.3%');
    expect(percent(1)).toBe('100%');
  });
});
