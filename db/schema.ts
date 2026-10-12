import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const members=sqliteTable('members',{id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),staff:integer('staff').notNull(),role:text('role').notNull(),status:text('status').notNull(),salt:text('salt').notNull(),hash:text('hash').notNull(),created:integer('created').notNull()});
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),uid:text('uid').notNull(),expires:integer('expires').notNull()});
export const files=sqliteTable('files',{id:text('id').primaryKey(),name:text('name').notNull(),size:integer('size').notNull(),staff:integer('staff').notNull(),uid:text('uid').notNull(),created:integer('created').notNull()});
export const settings=sqliteTable('settings',{id:integer('id').primaryKey(),data:text('data').notNull()});
export const posts=sqliteTable('posts',{id:text('id').primaryKey(),type:text('type').notNull(),title:text('title').notNull(),body:text('body').notNull(),created:integer('created').notNull()});
export const activity=sqliteTable('activity',{id:text('id').primaryKey(),uid:text('uid').notNull(),staff:integer('staff').notNull(),label:text('label').notNull(),created:integer('created').notNull()});
export const limits=sqliteTable('limits',{id:text('id').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
export const bootstrap=sqliteTable('bootstrap',{id:integer('id').primaryKey(),uid:text('uid').notNull()});
