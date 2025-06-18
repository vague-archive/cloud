# AWS SSH Configuration

AWS resources are not internet accessible except via our `ops.play.void.dev` bastion host.
To make it easier to SSH into private resources you can configure SSH to `ProxyJump` via
the bastion host.

## Installation

  * Copy the `void-cloud.conf` config to `/etc/ssh/ssh_config.d/`
  * ... or copy/paste the contents into your `~/.ssh/config`

## Usage

With this configuration in place you should now be able to...

```bash
> ssh ops   # to get to the ops server
> ssh web1  # to get to the web1 server
> ssh web2  # to get to the web2 server
> ssh files # to get to the file server
```

> NOTE: your username (and SSH public key) must be provisioned in production for this to work - ask Jake
