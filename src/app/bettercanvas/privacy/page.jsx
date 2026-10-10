export const metadata = {
  title: "Privacy Policy | Better Canvas Calendar Sync",
};

export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-fg-2">Better Canvas Calendar Sync · Last updated October 10, 2026</p>
      <h2>Data accessed</h2>
      <ul>
        <li>Your Canvas calendar feed (iCal URL) and any course websites you configure, to read assignment names and due dates.</li>
        <li>Your Google account, limited to the Google Tasks scope, to create, update and delete tasks in a dedicated task list.</li>
      </ul>
      <h2>How it is used</h2>
      <p>
        Data is used only to sync assignments into Google Tasks. It is not
        sold, shared with third parties, used for advertising, or used to
        train AI models.
      </p>
      <h2>Storage</h2>
      <p>
        The tool stores a small state file mapping assignments to task IDs,
        plus the credentials needed to run (such as a Google refresh token),
        as private secrets. No analytics or tracking is used.
      </p>
      <h2>Google API data</h2>
      <p>
        Use of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>
      <h2>Your control</h2>
      <p>
        You can revoke access at any time in your{" "}
        <a href="https://myaccount.google.com/permissions">Google Account permissions</a>{" "}
        and delete the synced task list. To request deletion of any stored
        data, contact{" "}
        <a href="mailto:joshuamarkle25@gmail.com">joshuamarkle25@gmail.com</a>.
      </p>
    </>
  );
}
