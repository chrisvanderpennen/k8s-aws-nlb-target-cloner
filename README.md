# AWS NLB Target Cloner

Copies the target instances for an AWS AZ from a reference NLB Target Group to a target NLB Target Group and also maintains the registration status of the instances.

*Use Case:* Whitelisting a static IP address for zero rated data. All requests are routed to Kubernetes NGINX Ingress Controller.

1. Create an NLB and assign a subnet to an AZ and assign the EIP to that subnet.
2. Create a Target Group assigned to your VPC, ensure that Target Type is set to Instance, the Protocol is set to HTTP, and the Port is set to 80.
3. Add a new listener to the NLB you created with TCP port 80 and set the Action to Forward to the Target Group you created in step #2.
4. Setup a cronjob and define the environment variable values, see example YAML below.
5. Deploy using `kubectl`

```
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  labels:
    app: myapp-nlb-sync
  name: myapp-nlb-sync
  namespace: mynamespace
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - image: newtondev/k8s-aws-nlb-target-cloner:1.0.0
              name: app
              command: ['node', 'src/app.js']
              imagePullPolicy: IfNotPresent
              env:
                - name: AWS_REGION
                  value: eu-west-1
                - name: AWS_AVAILABILITY_ZONE
                  value: eu-west-1a
                - name: AWS_DEST_TG_ARN
                  value: arn:aws:elasticloadbalancing:eu-west-1:676182226267:targetgroup/zero-rated-data/ca38a5d4fe1e5fed
                - name: AWS_SRC_TG_ARN
                  value: arn:aws:elasticloadbalancing:eu-west-1:676182226267:targetgroup/k8s-tg-238c3521126c3-80-30603/3d2d23a6bcb7009a
```
---
| Environment Variable | Description | Example |
| --- | --- | ---|
| `AWS_REGION` | The AWS region to create the resources in. | `eu-west-1` |
| `AWS_AVAILABILITY_ZONE` | The AWS availability zone of the Target Group subnet | `eu-west-1a` |
| `AWS_DEST_TG_ARN` | The ARN of the Target Group you want to apply the changes to. | `arn:aws:elasticloadbalancing:eu-west-1:376181236267:targetgroup/mcm-test/da48a5c4fe1f5eed` |
| `AWS_SRC_TG_ARN` | The ARN of the Target Group instances you want to clone from. Usually beloning to the NGINX Ingress Controller you want to forward requests to. | `arn:aws:elasticloadbalancing:eu-west-1:376181236267:targetgroup/k8s-tg-558b3533125b3-80-30603/7d2d43a7bff7009a` |