import { getTier } from '../screens/game/LeagueScreen';

describe('getTier', () => {
  it('returns unranked when rounds === 0', () => {
    expect(getTier(1000, 0)).toBe('unranked');
    expect(getTier(0, 0)).toBe('unranked');
  });

  it('returns diamond for avg >= 800', () => {
    expect(getTier(800, 5)).toBe('diamond');
    expect(getTier(1000, 1)).toBe('diamond');
    expect(getTier(850, 10)).toBe('diamond');
  });

  it('returns gold for avg 600–799', () => {
    expect(getTier(600, 5)).toBe('gold');
    expect(getTier(750, 3)).toBe('gold');
    expect(getTier(799, 1)).toBe('gold');
  });

  it('returns silver for avg 400–599', () => {
    expect(getTier(400, 5)).toBe('silver');
    expect(getTier(500, 10)).toBe('silver');
    expect(getTier(599, 2)).toBe('silver');
  });

  it('returns bronze for avg 0–399', () => {
    expect(getTier(0, 5)).toBe('bronze');
    expect(getTier(200, 3)).toBe('bronze');
    expect(getTier(399, 1)).toBe('bronze');
  });

  it('boundary: 800 is diamond not gold', () => {
    expect(getTier(800, 1)).toBe('diamond');
  });

  it('boundary: 600 is gold not silver', () => {
    expect(getTier(600, 1)).toBe('gold');
  });

  it('boundary: 400 is silver not bronze', () => {
    expect(getTier(400, 1)).toBe('silver');
  });
});
