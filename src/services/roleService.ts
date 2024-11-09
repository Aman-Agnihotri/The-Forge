import { prisma } from "../config/prisma";

export const roleService = {

    getAllRoles: async () => {
        return prisma.roles.findMany({
            select: { 
                id: true, 
                name: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                } 
            }
        });
    },
    
    getRoleById: async (id: string) => {
        return prisma.roles.findUnique({
            where: { id },
            select: { 
                id: true, 
                name: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                } 
            }
        });
    },
    
    getRoleByName: async (name: string) => {
        return prisma.roles.findFirst({ 
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            } 
        });
    },

    createRole: async (name: string) => {
        return prisma.roles.create({ 
            data: { name },
            select: {
                id: true,
                name: true
            }
        });
    },

    updateRole: async (id: string, name: string) => {
        return prisma.roles.update({
            where: { id },
            data: { name },
            select: { 
                id: true, 
                name: true,
                users: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                } 
            }
        });
    },

    deleteRole: async (id: string) => {
        return prisma.$transaction(async (prisma) => {
            const disconnectedUsers = await prisma.user_role.deleteMany({
                where: { roleId: id }
            });
            const deletedRole = await prisma.roles.delete({ where: { id } });
            return { disconnectedUsersCount: disconnectedUsers.count, deletedRole };
        });
    }
}