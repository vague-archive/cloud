configure:
	ansible-playbook -u admin -i inventory/production playbooks/all.yml

configure-ops:
	ansible-playbook -u admin -i inventory/production playbooks/operations.yml

configure-web:
	ansible-playbook -u admin -i inventory/production playbooks/web.yml

configure-files:
	ansible-playbook -u admin -i inventory/production playbooks/files.yml

build-production-image:
	VERSION=production bin/docker/build

push-production-image:
	docker push ghcr.io/vaguevoid/cloud:production

deploy-production-image:
	VERSION=production kamal deploy -c kamal.yml -P
