type MoveAnnouncerProps = {
  text: string;
};

// Port of the prototype live region (design/Task List.dc.html:801). Stays
// mounted with an empty text so screen readers pick up the first message.
export function MoveAnnouncer({ text }: MoveAnnouncerProps) {
  return (
    // <output> carries the implicit role="status".
    <output aria-live="assertive" className="sr-only">
      {text}
    </output>
  );
}
