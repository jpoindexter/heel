/** Three dots in a small cloud over Greg's head: Heel is working on it. Decoration only; the dots pulse unless motion is reduced. */
export function ThoughtBubble() {
  return (
    <div className="thought" aria-hidden="true">
      <span className="thought-dot" />
      <span className="thought-dot" />
      <span className="thought-dot" />
      <span className="thought-trail" />
      <span className="thought-trail thought-trail-small" />
    </div>
  );
}
