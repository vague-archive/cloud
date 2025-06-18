# Hosting in AWS

We host `play.void.dev` in an AWS VPC

 1. AWS resources are provisioned using Cloudformation (see [vpc.yml](./cloudformation/vpc.yml))
 2. EC2 servers are configured using Ansible (see [make configure](./Makefile))
 3. App is deployed using Kamal (see [make build/push/deploy-production-image](./Makefile))

In reverse order...

## 3. Kamal Deployment

We are experimenting with [Kamal](https://kamal-deploy.org/) for deploying our application
via Docker containers using a zero downtime, rolling restart strategy.

Our deployment is automated via the [production.yml](../../.github/workflows/production.yml)
GitHub Action workflow, which is a 2 step process:
  * [publish-docker.yml](../../.github/workflows/publish-docker.yml) - build our docker image and publish to our (private) registry
  * [deploy-aws.yml](../../.github/workflows/deploy-aws.yml) - run `kamal deploy` to perform a rolling deploy to our production instances

NOTE: You can also deploy manually, **if** you have Kamal installed **and** you have all of our
`PRODUCTION_***` secrets in your environment, with the following steps:

```bash
> git checkout production
> git pull
> cd deploy/aws
> ssh-add ~/.ssh/void-cloud-deploy # add our deploy SSH key
> make build-production-image      # build our docker image
> make push-production-image       # push our docker image to our private registry
> make deploy-production-image     # deploy our docker image to production
```

## 2. EC2 Configuration

Our EC2 instances are pretty dumb Docker hosts, but still need to have
software (e.g. `apt`, `ssh`, `ufw`, `docker`, etc) installed and
configured (e.g. `users`, `/etc/hosts`, `timezone`, etc)

We do this using Ansible to apply playbooks to the EC2 hosts over SSH.

This is mostly an up-front one-time configuration and should not need
to be modified or re-run, but the commands are:

```bash
> cd deploy/ops
> ssh-add ~/.ssh/void-cloud-admin   # add our admin SSH key
> make configure-ops                # run playbook for configuring ops server(s)
> make configure-web                # run playbook for configuring web server(s)
> make configure-files              # run playbook for configuring file server(s)
```

## 1. CloudFormation VPC Resources

Our AWS VPC resources are provisioned using a single CloudFormation 
stack defined in [vpc.yml](./cloudformation/vpc.yml)

![architecture](./vpc.jpg?raw=true)

Currently...
  * A single CloudFormation stack applied/updated manually via the AWS console (see `void-cloud` stack)
  * Just a single AZ for now, but ready for cross-AZ when we have time
  * Currently using 2 EC2 instances `web1` and `web2` for both web and worker services
  * Currently using 1 EC2 instance `files` for our file server
  * Currently using 1 EC2 instance `ops` for our SSH bastion host
  * Public subnets route to the internet via the internet gateway
  * Private subnets route to the internet via the nat gateway
  * The load balancer performs SSL offloading
  * `SourceDestCheck` disabled on `opsprivateinterface` to enable SSH tunnels via ops box
  * All ec2 instances use cloud config to set their hostname
  * The `ops` ec2 instance uses cloud config to bootstrap it's dual AZ network routing
  * The `files` instances need a manual volume format on first provision (see below)

Not shown on this diagram are 3 security groups...

  * `loadbalancer` - allows HTTP and HTTPS to reach the load balancer only
  * `web` - allows HTTP traffic between the load balancer and the web servers
  * `public` - allows PING and SSH to instances in the public subnet(s) - e.g. the ops box
  * `private` - allows ANY traffic CONTAINED WITHIN the private subnet(s)

AFTER VERY FIRST STACK PROVISION

SSH to the `files` instance and format and mount the /files volume
 - see https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html#:~:text=To%20mount%20an%20attached%20EBS,unique%20identifier%20(UUID)%20instead.

```bash
> lsblk                             # to get device name - assumed /dev/nvme1n1 below
> sudo mkfs -t xfs /dev/nvme1n1     # to format new EBS volume
> sudo mkdir /files                 # to create mount point
> sudo mount /dev/nvme1n1 /files    # to (test) manual mount
> sudo blkid                        # to get disk UUID
> sudo vim /etc/fstab               # and add a permanent mount... something like (replace the UUID)

UUID=aebf131c-6957-451e-8d34-ec978d9581ae  /files  xfs  defaults,nofail  0  2
```
