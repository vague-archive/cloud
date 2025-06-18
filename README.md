# Void Cloud Services

This repository contains the web application containing the cloud services that support the
Void game development platform - starting with sharing games for playtesting.

## PRODUCTION

The production version of this cloud application is currently hosted at

  * [https://play.void.dev](https://play.void.dev)

The application is currently hosted in an [AWS VPC](./deploy/aws/readme.md)

## Status Updates

I'm occasionally recording short loom videos with status updates as features are developed. It might
be useful to keep links to those videos here:

  * 12/16/2024 - [Coffee Demo - Share on Fiasco](https://www.loom.com/share/3c9cc389627c409a8b1ffda82cd0efae)
  * 8/05/2024 - [Coffee Demo - Share on Steam](https://void.rewatch.com/video/ktwi7glizu2sfy6j-coffee-30-demos-august-5-2024)
  * 6/06/2024 - [Password Protect Shared Games](https://www.loom.com/share/a6377bb8ea9344ad92f081174be9a226?sid=8f9eb943-cad1-489b-95b0-9749aeabe052)
  * 6/03/2024 - [Coffee Demo - Share on Web](https://void.rewatch.com/video/9w89gf7bm574sw5v-coffee-30-demo-share-pod-june-3-2024)
  * 4/08/2024 - [Cloud VCR Playback](https://www.loom.com/share/19278d926dec4e988c2322139cd5a2ae)
  * 3/25/2024 - [Upload Tapes](https://www.loom.com/share/a79b692f16184137908d8e74a9af90b9)
  * 3/16/2024 - [Replayable Random Numbers](https://www.loom.com/share/ae29aa39b94e465f88b30a5fc70488b7)
  * 3/13/2024 - [Full VCR UX](https://www.loom.com/share/1bafe1c825bf4ff299dc530502965e65)
  * 3/12/2024 - [Accurate Replays](https://www.loom.com/share/6ae731bb926842d2add0c926b42305ba)
  * 3/09/2024 - [Cloud VCR (POC)](https://www.loom.com/share/45f773f126a34d48b9e02c0790f73e8c)
  * 2/25/2024 - [Preview Deploys](https://www.loom.com/share/88430d4ed1724cf9a5399cc5df303f8d)
  * 2/20/2024 - [Production](https://www.loom.com/share/7712430de8cb4f7884dd15c7a420a0ca)

## Quick Start

It is assumed:

  * You are running a Linux or Mac development environment
  * You have [Deno](https://docs.deno.com/runtime/manual) (1.46.3) installed
  * You have [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/) (7.x) installed
  * You have [Mysql](https://dev.mysql.com/doc/refman/8.0/en/installing.html) (8.2) installed
    and can login as `void@localhost` with password `void`
  * You have an exported `DENO_AUTH_TOKENS` environment variable (see below)

We recommend you install Deno using the [asdf](https://github.com/asdf-vm/asdf) language manager.
A `.tool-versions` file is included, so a simple `asdf install` should get you started. You can
install mysql and redis directly on your development environment, or if you prefer you can run them via
via [Docker: mysql](https://hub.docker.com/_/mysql) [Docker: redis](https://hub.docker.com/_/redis).

With these system dependencies in place you can get started with the following development tasks:

```bash
> deno task db reset   # drop, re-create, and migrate (development) database
> deno task dev        # run development server
> deno task test       # run unit tests (with permissions)
> deno task lint       # run typescript linter
> deno task console    # run REPL with db connection and domain already instantiated
> deno task build      # build assets (for production)

# database commands
> deno task db drop    # drop (development and test) database if they exist
> deno task db create  # create (development and test) database if they do not already exist
> deno task db migrate # migrate databases if they exist
> deno task db reset   # drop -> create -> migrate in a single step
> deno task db new foo # create a new (empty) migration file
```

> we recommend you setup a shell `alias dt deno task -q` to shorten these frequently used commands

## Environment Variables

The development server should work without most environment variables (defaults can be
found in `config.ts`). To customize your development environment, copy `.env.example`
to `.env` and edit the values appropriately. In order to login to your local environment you
will need to enable at least one of the SSO options. You will need to ask for the (dev) values for
either the github or discord oauth apps (ask Jake).

```bash
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=yyy

# or

DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=yyy
```

## DENO_AUTH_TOKENS

Currently the `@vaguevoid/sdk` is hosted in a private npm registry (at github), and unfortunately
the Deno runtime does not currently support private **NPM** registries. However it does support
private **ESM** registries, so we have a self hosted ESM registry at `https://esm.void.dev` that
we use to serve the SDK as ESM files. That registry is still private, so you need the following
environment variable to access it:

```bash
export DENO_AUTH_TOKENS=******@esm.void.dev         # see jake for the actual token
```

Storing it in your cloud project `.env` file is - unfortunately - not adequate, because it is
needed by the deno runtime for things like `deno cache` and `deno check`. So you will need to
export it from your `bashrc` or equivalent. If you keep your dotfiles in source control you will
need to be careful not to commit this token. I recommend adding a global `.env` file with the
following:

```bash
if [ -f $HOME/.env ]; then
  . $HOME/.env
fi
```

Then you can include the line `export DENO_AUTH_TOKENS=****@esm.void.dev` in your `~/.env` file

## Repository Structure

Key folders and files in the repository include:

    └── README.md          - this file
    └── deno.jsonc         - deno project configuration
    └── public             - static web assets
    └── cmd
        └── console.ts       - DEVELOPMENT CONSOLE ENTRY POINT
        └── dev.ts           - DEVELOPMENT WEB SERVER ENTRY POINT
        └── task.ts          - DEVELOPMENT CLI TASKS (run via deno task)
        └── database.ts      - DATABASE CLI TASKS (run via deno task db)
        └── files.ts         - PRODUCTION FILE SERVER ENTRY POINT
        └── minions.ts       - PRODUCTION WORKER QUEUE ENTRY POINT
        └── web.ts           - PRODUCTION WEB SERVER ENTRY POINT
    └── src
        └── deps.ts          - dependency imports
        └── db
            └── migration    - schema migrations
            └── schema.ts    - schema definition
            └── helpers.ts   - database helper methods
        └── domain
            └── account.ts   - account domain logic
            └── games.ts     - games domain logic
            └── sysadmin.ts  - sysadmin domain logic
        └── file
            └── server.ts    - our proxy file server (manages our disk cache)
        └── lib
            └── *.ts         - various helper methods
        └── minions
            └── minions.ts   - background worker minion dispatcher
            └── file/*       - file minions
            └── s3/*         - s3 minions
        └── task
            └── build.ts     - build tasks - run via `deno build`
            └── ...          - other tasks - run via `deno task ***`
        └── test
            └── builder.ts   - contains our Test() wrapper (around Deno.test)
            └── bypass.ts    - mock fetch test helpers (wrapper around msw)
            └── factory.ts   - build (in memory) or create (in db) domain entities to (A)rrange a test
            └── faker.ts     - fake data generator test helpers (wrapper around faker-js)
            └── test.ts      - test exports
        └── web
            └── assets       - dynamic assets
              └── script.ts  - main page script entrypoint
              └── styles.css - main page tailwind styles
            └── action       - API endpoints
            └── component    - SSR JSX components
            └── page         - SSR JSX pages
            └── middleware   - web stack middleware
            └── policy.ts    - web authorization policies
            └── router.ts    - web router
            └── server.ts    - web server
            └── web.ts       - web exports

Note the layered:

  * `cmd/*`       - entry points for servers and cli tools
  * `src/web`     - the web application, and...
  * `src/minions` - the background workers, which both call methods from...
  * `src/domain`  - ... the abstract business logic queries and commands that use...
  * `src/db`      - ... the underlying kysely database schema and query builder.
  * `src/lib`     - meanwhile, general purpose utility methods are available to all layers
  * `src/task`    - tasks run via `deno task ***`
  * `src/test`    - test helper methods are available for automated tests

## Development Process

This repository will be updated using small short lived feature branches and PRs. Keep PRs as
small as possible and prefer lots of small PRs over larger ones. For now PRs do not require any
formal code review for approval and I'll probably just be merging them in as I go along, but
anyone interested can follow along.

## Dependencies

Other than the [Deno Runtime](https://docs.deno.com/runtime/manual),
[Mysql](https://dev.mysql.com/doc/refman/8.0/en/installing.html), and
[Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/),
all other dependencies will be downloaded automatically

  * [Deno Standard Library](https://github.com/denoland/std) - standard library
  * [MySQL2 Adapter](https://sidorares.github.io/node-mysql2/docs) (3.10.0) - MySQL adapter
  * [Kysely](https://kysely.dev/) (0.27.3) - SQL query builder and DB migrations
  * [Oak Router](https://deno.land/x/oak@v16.1.0) (16.1.0) - HTTP middleware, router, and static file server
  * [Preact](https://preactjs.com/guide/v10/server-side-rendering) - JSX server side rendering
  * [Htmx](https://htmx.org/) (2.0.1) - declarative client/server Ajax interactivity
  * [Alpine.js](https://alpinejs.dev/) (3.11.1) - declarative client-side interactivity
  * [OAuth2 Client](https://deno.land/x/oauth2_client@v1.0.2) (1.0.2) - oAuth for social SSO
  * [Postmark](https://github.com/ActiveCampaign/postmark.js) (4.0.4) - outbound email adapter
  * [Mock Service Worker](https://mswjs.io/) (2.0.8) - mock out fetch API calls for tests
  * [Faker JS](https://fakerjs.dev/) (8.4.1) - generate fake data for tests
  * [Luxon](https://moment.github.io/luxon/#/) (3.4.2) - easier DateTime, Duration, and Timezone management

## Database Schema

Please note that we are not using an ORM or any kind of magical database schema management
system, we are using a fairly explicit and traditional SQL query builder [Kysely](https://kysely.dev/).
While this might add a little bit of friction to development work we think the low level and
explicit approach gives us more control and puts us in a better long term position than a magical
ORM framework.

But it does mean that when you are thinking of making schema changes you need to consider:

  1. Generate (and implement) a new migration using `deno task db new`
  2. Update the runtime type safe schema in `src/db/schema.ts`
  3. Encapsulate any DB queries or commands in an appropriate `src/domain/***` method
  4. Add a test factory builder in `src/test/factory.ts`

See [Migration Cheat Sheet](src/db/migration/cheat-sheet.md) for sample migration code snippets

## Redis Configuration

Our application requires Redis keyspace notifications to be enabled,
either update your `/etc/redis/redis.conf` file...

```ini
notify-keyspace-events AKE
```

... or connect in the `redis-cli` and run

```bash
redis-cli> config SET notify-keyspace-events AKE
```
