VERSION=1.0.1
IMAGE_NAME='cvanderpennen/k8s-aws-nlb-target-cloner'

# Build the container
build: 
	docker build -t ${IMAGE_NAME} --no-cache .

release-latest:
	docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${VERSION}
	docker push ${IMAGE_NAME}:latest
	docker push ${IMAGE_NAME}:${VERSION}

release-version:
	docker docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${VERSION}
	docker push ${IMAGE_NAME}:${VERSION}

k8s-deploy:
	kubectl create -f kubernetes/cronjob.yaml