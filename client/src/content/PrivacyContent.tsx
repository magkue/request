import { SENTRY_DSN } from "@/config/sentry";
import { OTEL_COLLECTOR_URL } from "@/config/telemetry";

export function PrivacyContent() {
  const sentryEnabled = Boolean(SENTRY_DSN);
  const otelEnabled = Boolean(OTEL_COLLECTOR_URL);

  return (
    <>
      <p className="mb-4">
        The Research Group for Applied Education Technologies (referred to as
        AET in the following paragraphs) from the Technical University of Munich
        takes the protection of private data seriously. We process personal data
        in compliance with applicable data protection regulations, in
        particular:
      </p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>The General Data Protection Regulation (GDPR)</li>
        <li>
          The Bavarian Data Protection Act (BayDSG), which applies to public
          institutions in Bavaria
        </li>
        <li>
          The Telecommunications Telemedia Data Protection Act (TTDSG), which
          governs online services and the use of cookies
        </li>
      </ul>

      <p className="mb-4">
        Below, we inform you about the type, scope and purpose of the collection
        and use of personal data.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">Data we collect</h3>

      <p className="mb-4">
        This application collects and processes personal data that you provide
        when submitting resource requests. Depending on the type of request,
        this may include:
      </p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>
          <strong>Authentication data:</strong> When you log in via TUM&apos;s
          identity provider (Keycloak), we receive your name, email address, and
          TUM username.
        </li>
        <li>
          <strong>VM Request data:</strong> Hostname, project details (team
          name, thesis title, project name, responsible person), SSH public
          keys, and usernames of additional users.
        </li>
        <li>
          <strong>VM Access Request data:</strong> Target hostname,
          justification, contact person, and SSH public keys.
        </li>
        <li>
          <strong>Artemis Developer Request data:</strong> Name, email addresses
          (main and Slack), GitHub username and profile information (avatar,
          profile URL), contact person, advisor, and subteam assignments.
        </li>
        <li>
          <strong>TUM Guest Account Request data:</strong> First name, last
          name, email address, date of birth, gender, nationality, contact
          person at TUM, and purpose of the guest account.
        </li>
      </ul>

      <h3 className="text-lg font-medium mb-2 mt-6">
        Purpose of data processing
      </h3>

      <p className="mb-4">
        We process your personal data for the following purposes:
      </p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>
          Processing and fulfilling your resource requests (virtual machines,
          access permissions, guest accounts, developer access)
        </li>
        <li>
          Creating and managing support tickets in our issue tracking system
        </li>
        <li>Contacting you regarding the status of your requests</li>
        <li>Managing access to university systems and infrastructure</li>
        <li>Maintaining audit logs for security and compliance purposes</li>
      </ul>

      <h3 className="text-lg font-medium mb-2 mt-6">Legal basis</h3>

      <p className="mb-4">
        The legal basis for processing your data is Art. 6(1) lit. e GDPR
        (processing necessary for the performance of a task carried out in the
        public interest). The provision of IT resources and access management is
        part of the university&apos;s public duties in supporting research and
        teaching.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">Data retention</h3>

      <p className="mb-4">
        Your request data is stored for the duration of the resource allocation
        and retained for a reasonable period thereafter for audit, support, and
        compliance purposes. Data is deleted when it is no longer required for
        these purposes.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">Data recipients</h3>

      <p className="mb-4">Your data may be shared with:</p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>AET staff members responsible for processing your request</li>
        <li>System administrators who provision the requested resources</li>
        <li>Our issue tracking system for request management</li>
      </ul>

      <h3 className="text-lg font-medium mb-2 mt-6">Logging</h3>

      <p className="mb-4">
        The web servers of the AET are operated by the AET itself, based in
        Boltzmannstr. 3, 85748 Garching b. Munich. Every time our website is
        accessed, the web server temporarily processes the following information
        in log files:
      </p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>IP address of the requesting computer</li>
        <li>Date and time of access</li>
        <li>Name, URL and transferred data volume of the retrieved file</li>
        <li>Access status (requested file transferred, not found, etc.)</li>
        <li>
          Identification data of the browser and operating system used (if
          transmitted by the requesting web browser)
        </li>
        <li>
          Web page from which access was made (if transmitted by the requesting
          web browser)
        </li>
      </ul>

      <p className="mb-4">
        The processing of the data in this log file takes place as follows:
      </p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>
          The log entries are continuously and automatically evaluated in order
          to be able to detect attacks on the web server and react accordingly.
        </li>
        <li>
          In individual cases, i.e. in the case of reported disruptions, errors
          and security incidents, a manual analysis is carried out.
        </li>
      </ul>

      <p className="mb-4">
        The IP addresses contained in the log entries are not merged with other
        databases by AET, so that no conclusions can be drawn about individual
        persons.
      </p>

      {(sentryEnabled || otelEnabled) && (
        <>
          <h3 className="text-lg font-medium mb-2 mt-6">
            Error tracking and performance monitoring
          </h3>

          <p className="mb-4">
            To ensure the stability and security of this application, we use
            monitoring tools hosted on our own infrastructure at the Technical
            University of Munich. No data is transferred to third-party
            services.
          </p>

          {sentryEnabled && (
            <>
              <h4 className="text-base font-medium mb-2 mt-4">
                Sentry (Error Tracking)
              </h4>

              <p className="mb-4">
                We use a self-hosted Sentry instance for error tracking and
                performance monitoring. When an error occurs or during normal
                usage, the following data may be transmitted to our Sentry
                server:
              </p>

              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Error messages and stack traces</li>
                <li>Page URLs and navigation paths</li>
                <li>Browser type, version, and operating system</li>
                <li>Performance data (page load times, API response times)</li>
                <li>User interaction events (e.g. button clicks)</li>
              </ul>

              <p className="mb-4">
                No directly identifying information (such as IP addresses,
                names, or email addresses) is collected. However, technical data
                such as browser type, version, and operating system is
                transmitted. This processing is based on your consent (Art. 6(1)
                lit. a GDPR). You can withdraw your consent at any time by
                deleting the <code>monitoring_consent</code> cookie in your
                browser settings.
              </p>
            </>
          )}

          {otelEnabled && (
            <>
              <h4 className="text-base font-medium mb-2 mt-4">
                OpenTelemetry (Performance Monitoring)
              </h4>

              <p className="mb-4">
                We use OpenTelemetry to collect performance metrics and request
                traces on our own infrastructure. This includes:
              </p>

              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>
                  Page load performance metrics (Largest Contentful Paint,
                  Cumulative Layout Shift, Interaction to Next Paint)
                </li>
                <li>API request URLs, durations, and status codes</li>
                <li>User interaction events (e.g. button clicks)</li>
                <li>
                  Trace correlation identifiers to link frontend and backend
                  requests
                </li>
              </ul>

              <p className="mb-4">
                This data is used to identify performance bottlenecks and
                improve the user experience. This processing is based on your
                consent (Art. 6(1) lit. a GDPR). You can withdraw your consent
                at any time by deleting the <code>monitoring_consent</code>{" "}
                cookie in your browser settings.
              </p>
            </>
          )}
        </>
      )}

      <h3 className="text-lg font-medium mb-2 mt-6">Cookies</h3>

      <p className="mb-4">This application uses the following cookies:</p>

      <ul className="list-disc list-inside space-y-2 mb-4">
        <li>
          <strong>Session cookie:</strong> When you log in, a session cookie is
          stored to maintain your authenticated session. This cookie is
          essential for the functionality of the application and is deleted when
          you log out or close your browser.
        </li>
        {(sentryEnabled || otelEnabled) && (
          <li>
            <strong>
              <code>monitoring_consent</code>:
            </strong>{" "}
            Stores your choice regarding error tracking and performance
            monitoring (accepted or declined). This cookie is valid for one year
            and is required to remember your consent decision.
          </li>
        )}
      </ul>

      <h3 className="text-lg font-medium mb-2 mt-6">
        Right to file a complaint with the responsible supervisory authority
      </h3>

      <p className="mb-4">
        If you believe that the processing of your personal data violates
        applicable data protection laws, you have the right to lodge a complaint
        with a supervisory authority.
      </p>

      <p className="mb-4">
        Since this project is developed at the Technical University of Munich
        (TUM), a public institution in Bavaria, the applicable law is the
        Bavarian Data Protection Act (BayDSG), which supplements the General
        Data Protection Regulation (GDPR). The responsible supervisory authority
        for enforcing these regulations is:
      </p>

      <p className="mb-4">
        Bavarian State Commissioner for Data Protection (BayLfD)
        <br />
        Wagmullerstrasse 18
        <br />
        80538 Munich
        <br />
        Germany
        <br />
        Phone: +49 89 212672-0
        <br />
        Fax: +49 89 212672-50
        <br />
        Email:{" "}
        <a
          href="mailto:poststelle@datenschutz-bayern.de"
          className="text-primary hover:underline"
        >
          poststelle@datenschutz-bayern.de
        </a>
        <br />
        Website:{" "}
        <a
          href="https://www.datenschutz-bayern.de"
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://www.datenschutz-bayern.de
        </a>
      </p>

      <p className="mb-4">
        Alternatively, you may contact the supervisory authority in your place
        of residence or workplace. The supervisory authority will inform you
        about the progress and outcome of your complaint, including the
        possibility of a judicial remedy pursuant to Article 78 GDPR.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">
        Right to data portability
      </h3>

      <p className="mb-4">
        You have the right to request the data that we process automatically on
        the basis of your consent or in fulfillment of a contract to be handed
        over to you or a third party. The data is provided in a machine-readable
        format. If you request the direct transfer of the data to another person
        responsible, this will only be done if it is technically feasible.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">
        Right to information, correction, blocking, and deletion
      </h3>

      <p className="mb-4">
        You have at any time within the framework of the applicable legal
        provisions the right to request information about your stored personal
        data, the origin of the data, its recipient and the purpose of the data
        processing, and if necessary, a right to correction, blocking or
        deletion of this data. You can contact us at any time via{" "}
        <a
          href="mailto:krusche@tum.de"
          className="text-primary hover:underline"
        >
          krusche@tum.de
        </a>{" "}
        regarding this and other questions on the subject of personal data.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">SSL/TLS encryption</h3>

      <p className="mb-4">
        For security reasons and to protect the transmission of confidential
        content that you send to us as a site operator, our website uses an
        SSL/TLS encryption. This means that data that you transmit via this
        website cannot be read by third parties. You can recognize an encrypted
        connection by the &quot;https://&quot; address line in your browser and
        by the lock symbol in the browser line.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">E-mail security</h3>

      <p className="mb-4">
        If you e-mail us, your e-mail address will only be used for
        correspondence with you. Please note that data transmission on the
        Internet can have security gaps. Complete protection of data from access
        by third parties is not possible.
      </p>

      <h3 className="text-lg font-medium mb-2 mt-6">
        Name and contact details of the person responsible
      </h3>

      <p className="mb-4">
        Technical University of Munich
        <br />
        Postal address: Prof. Dr. Stephan Krusche (CIT-I1) Boltzmannstrasse 3
        85748 Garching b. Munich
        <br />
        Office: 01.07.044
        <br />
        E-mail:{" "}
        <a
          href="mailto:krusche@tum.de"
          className="text-primary hover:underline"
        >
          krusche@tum.de
        </a>
      </p>
    </>
  );
}
