import { JSON, JSONEncoder } from "assemblyscript-json";

function acceptRequest(): string {
  let encoder = new JSONEncoder();

  encoder.pushObject("");
  encoder.setBoolean("accepted", true);
  encoder.setString("message", "");
  encoder.popObject();

  return encoder.toString();
}

function rejectRequest(message: string): string {
  let encoder = new JSONEncoder();

  encoder.pushObject("");
  encoder.setBoolean("accepted", false);
  encoder.setString("message", message);
  encoder.popObject();

  return encoder.toString();
}

export function settingsValidated(): string {
  let encoder = new JSONEncoder();

  encoder.pushObject("");
  encoder.setBoolean("valid", true);
  encoder.popObject();

  return encoder.toString();
}

function hasPrivilegedSecurityContext(value: JSON.Value): bool {
  let obj = changetype<JSON.Obj>(value);
  if (!obj.has("securityContext")) {
    return false;
  }

  let sc = obj.get("securityContext") as JSON.Obj;
  if (!sc.has("privileged")) {
    return false;
  }
  let privileged = sc.get("privileged") as JSON.Bool;
  return privileged._bool;
}

export function validate(req: JSON.Obj): string {
  let reqKind = req.get("requestKind") as JSON.Obj;
  let kind = reqKind.get("kind") as JSON.Str;
  if (kind._str != "Pod") {
    return acceptRequest();
  }

  let operation = req.get("operation") as JSON.Str;
  if ((operation._str != "CREATE") && (operation._str != "UPDATE")) {
    return acceptRequest();
  }

  let object = req.get("object") as JSON.Obj;
  let spec = object.get("spec") as JSON.Obj;

  // look into all the containers to see if they have privileged security
  // contexts
  let containers = spec.get("containers") as JSON.Arr;
  let allContainersUnprivileged = containers._arr.every(
    (value: JSON.Value, index: i32, array: Array<JSON.Value>): bool => !hasPrivilegedSecurityContext(value));

  if (allContainersUnprivileged) {
    return acceptRequest();
  }

  // at this point either the Pod has a top-level privileged security context,
  // or at least one of its containers does
  let userInfo = req.get("userInfo") as JSON.Obj;
  let username = userInfo.get("username") as JSON.Str;

  return rejectRequest("Privileged containers are not allowed");
}