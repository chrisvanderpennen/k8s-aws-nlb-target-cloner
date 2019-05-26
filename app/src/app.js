require('dotenv').config();
const AWS = require('aws-sdk');
const elbv2 = new AWS.ELBv2({ region: process.env.AWS_REGION });
const ec2 = new AWS.EC2({ region: process.env.AWS_REGION });

async function getSrcNlbTgHealth() {
  return await getTargetHealth(process.env.AWS_SRC_TG_ARN);
}

async function getDestNlbTgHealth() {
  return await getTargetHealth(process.env.AWS_DEST_TG_ARN);
}

async function registerDestNlbTgTargets(targets) {
  return await registerTargets(process.env.AWS_DEST_TG_ARN, targets);
}

async function deregisterDestNlbTgTargets(targets) {
  return await deregisterTargets(process.env.AWS_DEST_TG_ARN, targets);
}

/**
 * @param {*} targetGroupArn 
 */
async function getTargetHealth(targetGroupArn) {
  return new Promise((resolve, reject) => {
    const params = {
      TargetGroupArn: targetGroupArn
    };
    /* https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#describeTargetHealth-property */
    elbv2.describeTargetHealth(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * @param {*} targetGroupArn 
 * @param {*} targets 
 */
async function registerTargets(targetGroupArn, targets) {
  return new Promise((resolve, reject) => {
    const params = {
      TargetGroupArn: targetGroupArn,
      Targets: targets
    };
    /* https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#registerTargets-property */
    elbv2.registerTargets(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * @param {*} targetGroupArn 
 * @param {*} targets 
 */
async function deregisterTargets(targetGroupArn, targets) {
  return new Promise((resolve, reject) => {
    const params = {
      TargetGroupArn: targetGroupArn,
      Targets: targets
    };
    /* https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#deregisterTargets-property */
    elbv2.deregisterTargets(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function describeInstanceStatus(instanceIds) {
  return new Promise((resolve, reject) => {
    const params = {
      InstanceIds: instanceIds
    };
    /* https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html#deregisterTargets-property */
    ec2.describeInstanceStatus(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function getRegisterInstances(referenceTargets) {
  const instanceIds = referenceTargets.map((target) => target.Id);
  const instanceStatus = await describeInstanceStatus(instanceIds);
  const instances = instanceStatus.InstanceStatuses.filter((instance) => instance.AvailabilityZone === process.env.AWS_AVAILABILITY_ZONE).map((target) => target.InstanceId);

  const registerInstances = [];
  for (let instance of instances) {
    for (let target of referenceTargets) {
      if (target.Id == instance) {
        registerInstances.push(target);
      }
    }
  }

  if (registerInstances.length > 0) {
    console.log(`[getRegisterInstances] - Found instances: ${JSON.stringify(registerInstances)}`);
  } else {
    console.log('[getRegisterInstances] - No instances found.');
  }

  return registerInstances;
}

/**
 * @param {*} registerInstances 
 * @param {*} targetTargets 
 */
async function registerNewTargets(registerInstances, targetTargets) {
  let targetRegisterInstances = registerInstances;

  for (let instance of targetTargets) {
    const exists = targetRegisterInstances.filter((target) => target.Id == instance.Id);
    if (exists && exists.length > 0) {
      targetRegisterInstances = targetRegisterInstances.filter((target) => target.Id != exists[0].Id);
    }
  }

  // Only register new targets if there are any to register.
  if (targetRegisterInstances.length > 0) {
    console.log(`[registerNewTargets] - Registering new targets: ${JSON.stringify(targetRegisterInstances)}`);
    const result = await registerDestNlbTgTargets(registerInstances);
    console.log(`[registerNewTargets] - Result: ${JSON.stringify(result)}`);
  } else {
    console.log('[registerNewTargets] - No new targets to register.');
  }
}

/**
 * @param {*} registerInstances 
 * @param {*} targetTargets 
 */
async function deregisterRemovedTargets(registerInstances, targetTargets) {
  let targetDeregisterInstances = targetTargets.map((target) => target.Id);

  for (let instance of registerInstances) {
    const index = targetDeregisterInstances.indexOf(instance.Id);
    if (index > -1) {
      targetDeregisterInstances.splice(index, 1);
    }
  }

  // Only deregister targets if there are any to deregister.
  if (targetDeregisterInstances.length > 0) {
    const targets = targetDeregisterInstances.map((target) => { return { Id: targetId } });
    console.log(`[deregisterRemovedTargets] - Deregistering removed targets: ${JSON.stringify(targets)}`);
    const result = await deregisterDestNlbTgTargets(targets);
    console.log(`[deregisterRemovedTargets] - Result: ${JSON.stringify(result)}`);
  } else {
    console.log('[deregisterRemovedTargets] - No targets to deregister.');
  }
}

function checkVars() {
  if (!process.env.AWS_REGION) {
    console.error('[error] AWS_REGION has no value.');
    return false;
  }

  if (!process.env.AWS_AVAILABILITY_ZONE) {
    console.error('[error] AWS_AVAILABILITY_ZONE has no value.');
    return false;
  }

  if (!process.env.AWS_DEST_TG_ARN) {
    console.error('[error] AWS_DEST_TG_ARN has no value.');
    return false;
  }

  if (!process.env.AWS_SRC_TG_ARN) {
    console.error('[error] AWS_SRC_TG_ARN has no value.');
    return false;
  }

  return true;
}

/**
 * Main execution logic.
 */
async function main() {
  if (!checkVars()) {
    process.exit(1);
    return;
  }

  console.log(`[main] AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`[main] AWS_AVAILABILITY_ZONE: ${process.env.AWS_AVAILABILITY_ZONE}`);
  console.log(`[main] AWS_DEST_TG_ARN: ${process.env.AWS_DEST_TG_ARN}`);
  console.log(`[main] AWS_SRC_TG_ARN: ${process.env.AWS_SRC_TG_ARN}`);
  
  console.log(['[main] Fetching target NLB Target Group Health']);
  const targetNlbTargetHealth = await getDestNlbTgHealth();
  console.log(['[main] Fetch successful for target NLB Target Group Health']);
  const targetTargets = targetNlbTargetHealth.TargetHealthDescriptions.map((target) => { return { Id: target.Target.Id } });

  console.log(['[main] Fetching reference NLB Target Group Health']);
  const referenceNlbTgHealth = await getSrcNlbTgHealth();
  console.log(['[main] Fetch successful for reference NLB Target Group Health']);
  const referenceTargets = referenceNlbTgHealth.TargetHealthDescriptions.map((target) => { return { Id: target.Target.Id, Port: target.Target.Port } });

  console.log(['[main] Fetching reference Target Group instance details']);
  const registerInstances = await getRegisterInstances(referenceTargets);
  console.log(['[main] Fetch successful for reference Target Group instance details']);
  await registerNewTargets(registerInstances, targetTargets);
  await deregisterRemovedTargets(registerInstances, targetTargets);

  console.log('[main] job complete, exiting...');
}

main();