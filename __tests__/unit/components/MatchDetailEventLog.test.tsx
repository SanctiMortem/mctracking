/**
 * Unit tests — SCR-011 EventLog read-only section + ParticipantResultRow
 * HIST-003 (EPIC-04)
 */

describe('SCR-011 EventLog (read-only)', () => {
  it.todo('renders EventLogItem for each event in formattedEvents');
  it.todo('renders undone events with strikethrough via EventLogItem (isUndone=true)');
  it.todo('shows "Sin eventos registrados" when formattedEvents is empty');
  it.todo('does not render an Undo button');
});

describe('ParticipantResultRow in SCR-011', () => {
  it.todo('shows WIN badge and amber styling for the winner participation');
  it.todo('shows LOSS badge for a losing participation');
  it.todo('shows DRAW badge when result is draw');
  it.todo('shows — badge when result is null (abandoned)');
  it.todo('renders commander2 color chips when commander2 is present (partner deck)');
});
