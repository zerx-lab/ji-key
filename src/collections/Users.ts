import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'createdAt'],
    group: '系统管理',
  },
  auth: true,
  fields: [
    {
      name: 'role',
      label: '角色',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        { label: '管理员', value: 'admin' },
        { label: '普通用户', value: 'user' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
