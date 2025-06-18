import { outdent } from "@deps"
import { xdata } from "@lib/jsx"
import { CTX, Layout, RequestContext } from "@web"
import { Clipboard, CodeBlock } from "@web/component"

//=============================================================================
// PAGE
//=============================================================================

function HelpPage(ctx: RequestContext) {
  return (
    <Layout.Page ctx={ctx} title="Get Help" page="help">
      <div x-data={xdata({view: 'github'})}>
        <div class="mb-16">
          <ShareCard />
        </div>
        <ShareViaFiascoEditor />
        <ShareViaGitHubCard ctx={ctx} />
        <ShareViaDeployScript ctx={ctx} />
      </div>
    </Layout.Page>
  )
}

function ShareCard() {
  return (
    <card>
      <card-header>
        <card-title>Sharing your Game/Tool</card-title>
      </card-header>
      <card-body>
        <p>
          There are 3 options for sharing your game (or tool) at play.void.dev:
        </p>
        <ul class="list-decimal list-inside p-4 space-y-1">
          <li>Using the Fiasco Editor</li>
          <li>Using a GitHub Action</li>
          <li>Using a Deploy Script</li>
        </ul>
        <div class="flex gap-2" x-cloak>
          <button class="btn" x-bind:class="'btn-' + (view == 'editor' ? 'primary' : 'secondary')" x-on:click="view='editor'">Fiasco Editor</button>
          <button class="btn" x-bind:class="'btn-' + (view == 'github' ? 'primary' : 'secondary')" x-on:click="view='github'">GitHub Action</button>
          <button class="btn" x-bind:class="'btn-' + (view == 'script' ? 'primary' : 'secondary')" x-on:click="view='script'">Deploy Script</button>
        </div>
      </card-body>
    </card>
  )
}

function ShareViaFiascoEditor() {
  return (
    <card x-show="view == 'editor'" x-cloak="true">
      <card-ribbon class="bg-primary-200 text-primary-800">coming soon</card-ribbon>
      <card-header>
        <card-title>Share via the Fiasco Editor</card-title>
      </card-header>
      <card-body>
        <p>
          We are actively working to enable a simple ad-hoc "Share" button in the new
          Fiasco Editor...<br />
          ... details and instructions will be in the next Share Pod Demo scheduled for Dec 16th.
        </p>
      </card-body>
    </card>
  )
}

function ShareViaGitHubCard({ ctx }: {
  ctx: RequestContext
}) {
  const route = CTX.route(ctx)
  const code = outdent`
    name: Deploy

    on:
      push:
        branches: [main]

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout Repo
            uses: actions/checkout@v4

          - name: Build, Package, and Deploy to the Web
            uses: vaguevoid/actions/share/on/web@v1
            with:
              organization: "ORGANIZATION-ID"
              game:         "GAME-ID"
              label:        "main"
              token:        $\{{ secrets.VOID_ACCESS_TOKEN }}
  `;
  return (
    <card x-show="view == 'github'" x-cloak="true">
      <card-header>
        <card-title>Share via a GitHub Action</card-title>
      </card-header>
      <card-body>
        <div class="border-2 border-primary-100 bg-primary-50 text-large text-primary-800 p-4 mb-4">
          Below are the instructions for sharing your game (or tool) automatically whenever you
          commit new changes to the <code>main</code> branch of your GitHub repository using
          a <a class="link" href="https://github.com/vaguevoid/actions">GitHub Action Workflow</a>
        </div>
        <ol className="list-disc list-inside space-y-1">
          <li>
            copy your
            <a className="link" href={route("profile")}>personal access token</a>
            as a <code>VOID_ACCESS_TOKEN</code>
            <a class="link" target="_other" href="https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository">GitHub Repository Secret</a>
          </li>
          <li>
            copy the contents of the <code>deploy.yml</code> workflow below to your game directory as <code>./github/workflows/deploy.yml</code>
          </li>
          <ol className="list-inside ml-8">
            <li>
              replace <code>ORGANIZATION-ID</code> with your organization id
            </li>
            <li>
              replace <code>GAME-ID</code> with your game or tool ID
            </li>
            <li class="ml-4 text-gray italic">
              check your game settings page for ID values
            </li>
          </ol>
          <li>
            commit your changes
          </li>
        </ol>
        <div class="border-2 border-primary-100 bg-primary-50 text-large text-primary-800 p-4 my-4">
          Your new deploy action will now run every time you commit or merge new code into
          the <code>main</code> branch.
        </div>
        <div class="mt-4">
          <Clipboard content={code} label="copy to clipboard" />
        </div>
        <CodeBlock language="yaml" className="mt-2" code={code} />
      </card-body>
    </card>
  )
}

function ShareViaDeployScript({ ctx }: {
  ctx: RequestContext
}) {
  const route = CTX.route(ctx)
  const code = outdent`
    #!/bin/bash

    LABEL="$\{1}"
    WORK="$\{HOME}/.config/void"
    TOKEN="$\{WORK}/token"
    BUILD="$\{WORK}/build"
    BUNDLE="$\{WORK}/build.tgz"
    SERVER="$\{SERVER:-https://play.void.dev/}"
    ENDPOINT="$\{SERVER}api/ORGANIZATION-ID/GAME-ID/share"

    if [[ ! -n $\{VOID_ACCESS_TOKEN} ]]; then
      if [[ -f "$\{TOKEN}" ]]; then
        VOID_ACCESS_TOKEN=$(cat "$\{TOKEN}")
      else
        echo "No access token found. Find your access token on your profile page at $\{SERVER}profile and save it to ~/.config/void/token"
        exit 1
      fi
    fi

    mkdir -p $\{BUILD}
    bun run build --base "./" --outDir $\{BUILD} --emptyOutDir
    if [ $? -ne 0 ]; then
      echo "Build failed, not uploading to server."
      exit 1
    fi
    tar -czf $\{BUNDLE} -C $\{BUILD} .

    echo "Uploading build to $\{SERVER}"
    OUTPUT=$(curl -s -X POST --fail-with-body --connect-timeout 30 --max-time 300 -H "X-Deploy-Label: $\{LABEL}" -H "Authorization: Bearer $\{VOID_ACCESS_TOKEN}" --data-binary "@$\{BUNDLE}" $\{ENDPOINT})
    if [ $? -ne 0 ]; then
      echo $OUTPUT
      echo "Sorry, upload failed, please try again in a few minutes or contact support@void.dev"
      exit 1
    fi

    echo $OUTPUT
  `

  return (
    <card x-show="view == 'script'" x-cloak="true">
      <card-ribbon class="bg-danger-200 text-danger-800">deprecated</card-ribbon>
      <card-header>
        <card-title>Share via a Deploy Script</card-title>
      </card-header>
      <card-body>
        <div class="border-2 border-primary-100 bg-primary-50 text-large text-primary-800 p-4 mb-4">
          Below are the instructions for sharing your game (or tool) manually from the command
          line using a custom deploy script
        </div>
        <div class="border-2 border-danger-100 bg-danger-50 text-large text-danger-900 p-4 mb-2">
          <b>WARNING</b>: Mac or Linux only
        </div>
        <ol className="list-disc list-inside">
          <li>
            copy your{" "}
            <a className="link" href={route("profile")}>
              personal access token{" "}
            </a>
            into the file <code>~/.config/void/token</code>
          </li>
          <li>
            download the <code>./deploy</code> script below to your game directory
          </li>
          <ol className="list-inside ml-8">
            <li>
              replace <code>ORGANIZATION-ID</code> with your organization id
            </li>
            <li>
              replace <code>GAME-ID</code> with your game or tool ID
            </li>
            <li class="ml-4 text-gray italic">
              check your game settings page for ID values
            </li>
          </ol>
          <li>
            make the <code>./deploy</code> script executable via <code>chmod u+x deploy</code>
          </li>
        </ol>
        <div class="border-2 border-primary-100 bg-primary-50 text-large text-primary-800 p-4 my-4">
          With your <code>~/.config/void/token</code> and <code>./deploy</code> script in place you can now run{" "}
          <code>./deploy [NAME]</code>{" "}
          to build, upload, and playtest a build of your game. The URL for your game will be printed to the console.
        </div>
        <Clipboard content={code} label="copy to clipboard" />
        <CodeBlock language="bash" className="mt-4" code={code} />
      </card-body>
    </card>
  )
}

export const Help = {
  Page: HelpPage,
}

export default Help
