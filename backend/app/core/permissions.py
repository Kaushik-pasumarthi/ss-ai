from enum import Enum


class Role(str, Enum):
    Admin = "Admin"
    Sports_League_Manager = "Sports_League_Manager"
    Broadcaster_Analyst = "Broadcaster_Analyst"
    Compliance_Officer = "Compliance_Officer"


# Permission matrix: resource_action -> set of allowed roles
PERMISSIONS: dict[str, set[Role]] = {
    "asset:create": {Role.Admin, Role.Sports_League_Manager},
    "asset:read": {Role.Admin, Role.Sports_League_Manager, Role.Broadcaster_Analyst, Role.Compliance_Officer},
    "asset:delete": {Role.Admin},
    "incident:read": {Role.Admin, Role.Sports_League_Manager, Role.Broadcaster_Analyst, Role.Compliance_Officer},
    "incident:update_status": {Role.Admin, Role.Sports_League_Manager, Role.Compliance_Officer},
    "takedown:manage": {Role.Admin, Role.Compliance_Officer},
    "analytics:export": {Role.Admin, Role.Sports_League_Manager, Role.Broadcaster_Analyst, Role.Compliance_Officer},
    "user:manage": {Role.Admin},
    "demo:seed": {Role.Admin},
    "scan:trigger": {Role.Admin},
}


def has_permission(role: str, action: str) -> bool:
    allowed = PERMISSIONS.get(action, set())
    return Role(role) in allowed
