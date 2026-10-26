export function peopleAheadMessage(peopleAhead: number): string {
  if (peopleAhead === 0) return 'You are next.';
  return `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'} ahead of you.`;
}
