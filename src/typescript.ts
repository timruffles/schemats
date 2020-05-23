/**
 * Generate typescript interface from table schema
 * Created by xiamx on 2016-08-10.
 */

import * as _ from 'lodash'

import { TableDefinition } from './schemaInterfaces'
import Options from './options'

function nameIsReservedKeyword (name: string): boolean {
    const reservedKeywords = [
        'string',
        'number',
        'package'
    ]
    return reservedKeywords.indexOf(name) !== -1
}

function normalizeName (name: string, options: Options): string {
    if (nameIsReservedKeyword(name)) {
        return name + '_'
    } else {
        return name
    }
}

function jsStringList(names: string[]) {
    return names.map(c => `${c}`).join(', ')
}

export function generateTableInterface (tableNameRaw: string, tableDefinition: TableDefinition, options: Options) {
    const tableName = options.transformTypeName(tableNameRaw)
    const names = Object.keys(tableDefinition)
        .map(c => options.transformColumnName(c))

    const members = names
        .map((name) => (
            `readonly ${name}: ${tableName}Fields.${name}`
        )).join(', \n')


    const defaultInsertExcludes = ['created_at', 'updated_at'];

    const insertFields = Object.entries(tableDefinition)
        .filter(([name, def]) => (
            !def.isSequence && !defaultInsertExcludes.includes(name)
        ))
        .map(([name]) => options.transformColumnName(name))

    const namesToColumns = Object.fromEntries(
        Object.entries(tableDefinition)
        .map(([name]) => [options.transformColumnName(name), name])
    )

    const converter = Object.entries(tableDefinition)
        .map(([name]) => (
            `${name}: this.${options.transformColumnName(name)}`
        )).join(', ')

    const recordName = normalizeName(tableName, options)

    return `
        export class ${recordName} {
            static readonly fieldNames= ${JSON.stringify(names)} as const;
            static readonly insertFields= ${JSON.stringify(insertFields)} as const;
            static readonly namesToColumns= ${JSON.stringify(namesToColumns, null, 4)} as const;
            
            constructor(
                ${members}
            ) {}
            
            forDb() {
                return {${converter}}
            }
        }
    `
}

export function generateEnumType (enumObject: any, options: Options) {
    let enumString = ''
    for (let enumNameRaw in enumObject) {
        const enumName = options.transformTypeName(enumNameRaw)
        enumString += `export type ${enumName} = `
        enumString += enumObject[enumNameRaw].map((v: string) => `'${v}'`).join(' | ')
        enumString += ';\n'
    }
    return enumString
}

export function generateTableTypes (tableNameRaw: string, tableDefinition: TableDefinition, options: Options) {
    const tableName = options.transformTypeName(tableNameRaw)
    let fields = ''
    Object.keys(tableDefinition).forEach((columnNameRaw) => {
        let type = tableDefinition[columnNameRaw].tsType
        let nullable = tableDefinition[columnNameRaw].nullable ? '| null' : ''
        const columnName = options.transformColumnName(columnNameRaw)
        fields += `export type ${normalizeName(columnName, options)} = ${type}${nullable};\n`
    })

    return `
        export namespace ${tableName}Fields {
        ${fields}
        }
    `
}
