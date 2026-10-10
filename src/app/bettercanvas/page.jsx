export const metadata = {
  title: "Better Canvas Calendar Sync | Joshua Markle",
  description:
    "Syncs Canvas assignments into Google Tasks, cleaned up and kept live.",
};

export default function BetterCanvas() {
  return (
    <>
      <h1>Better Canvas Calendar Sync</h1>
      <p>
        A small personal project that syncs assignments from Canvas (and
        individual course websites) into Google Tasks, cleaned up and kept up
        to date.
      </p>
      <h2>What it does</h2>
      <ul>
        <li>Reads your Canvas calendar feed (iCal URL). No Canvas API token.</li>
        <li>Drops non-assignments such as Zoom links, lectures and office hours.</li>
        <li>Renames entries by course nickname, e.g. "Algos: HW 4 (@11:59pm)".</li>
        <li>Creates, updates and deletes matching tasks in a dedicated Google Tasks list.</li>
        <li>Runs every ~30 minutes so deadline changes carry over.</li>
      </ul>
      <h2>Notes</h2>
      <p>
        It never submits, posts or messages anything in Canvas. It only
        requests the Google Tasks scope.
      </p>
      <p>
        Questions? Email{" "}
        <a href="mailto:joshuamarkle25@gmail.com">joshuamarkle25@gmail.com</a>.
      </p>
      <p>
        <a href="/bettercanvas/privacy">Privacy Policy</a> ·{" "}
        <a href="/bettercanvas/terms">Terms of Service</a>
      </p>
    </>
  );
}
