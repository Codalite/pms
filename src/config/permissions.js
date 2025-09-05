// src/config/permissions.js
import { ADMIN, MANAGER, MEMBER } from './roles.js';

export const project = {
    create: [ADMIN, MANAGER],
    update: [ADMIN, MANAGER],
    delete: [ADMIN],
    addMember: [ADMIN, MANAGER],
    view: [ADMIN, MANAGER, MEMBER]
};
export const task = {
    create: [ADMIN, MANAGER, MEMBER],
    update: [ADMIN, MANAGER, MEMBER],
    delete: [ADMIN, MANAGER],
    assign: [ADMIN, MANAGER]
};