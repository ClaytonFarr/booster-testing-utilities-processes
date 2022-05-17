/* eslint-disable prettier/prettier */
import { describe, it, expect } from 'vitest'
import * as util from '../helpers-utils'

describe('Process Helper Utilities', async () => {
  //
  describe('Strings', async () => {
    const testStrings = [
      'test', 'test word string', 'test-word-string', 'test_word_string', 'test-word_string',
      'TEST WORD STRING', 'TEST-WORD-STRING', 'TEST_WORD_STRING', 'TEST-WORD_STRING',
      'Test', 'Test Word String', 'Test-Word-String', 'Test_Word_String', 'Test-Word_String',
      'Test word string', 'test-Word-string', 'test word_String', 'Test Word_String',
    ]
    const kebabCase = [
      'test', 'test-word-string', 'test-word-string', 'test-word-string', 'test-word-string',
      'test-word-string', 'test-word-string', 'test-word-string', 'test-word-string',
      'test', 'test-word-string', 'test-word-string', 'test-word-string', 'test-word-string',
      'test-word-string', 'test-word-string', 'test-word-string', 'test-word-string',
    ]
    const camelCase = [
      'test', 'testWordString', 'testWordString', 'testWordString', 'testWordString',
      'testWordString', 'testWordString', 'testWordString', 'testWordString',
      'test', 'testWordString', 'testWordString', 'testWordString', 'testWordString',
      'testWordString', 'testWordString', 'testWordString', 'testWordString',
    ]
    const PascalCase = [
      'Test', 'TestWordString', 'TestWordString', 'TestWordString', 'TestWordString',
      'TestWordString', 'TestWordString', 'TestWordString', 'TestWordString',
      'Test', 'TestWordString', 'TestWordString', 'TestWordString', 'TestWordString',
      'TestWordString', 'TestWordString', 'TestWordString', 'TestWordString',
    ]
    const titleCase = [
      'Test', 'Test Word String', 'Test Word String', 'Test Word String', 'Test Word String',
      'Test Word String', 'Test Word String', 'Test Word String', 'Test Word String',
      'Test', 'Test Word String', 'Test Word String', 'Test Word String', 'Test Word String',
      'Test Word String', 'Test Word String', 'Test Word String', 'Test Word String',
    ]
    const convertTestStringsToKebabCase = testStrings.map(util.toKebabCase)
    const convertTestStringsToCamelCase = testStrings.map(util.toCamelCase)
    const convertTestStringsToPascalCase = testStrings.map(util.toPascalCase)
    const convertTestStringsToTitleCase = testStrings.map(util.toTitleCase)
    it('- convert any string to kebab-case', async () => expect(convertTestStringsToKebabCase).toEqual(kebabCase))
    it('- convert any string to camelCase', async () => expect(convertTestStringsToCamelCase).toEqual(camelCase))
    it('- convert any string to PascalCase', async () => expect(convertTestStringsToPascalCase).toEqual(PascalCase))
    it('- convert any string to Title case', async () => expect(convertTestStringsToTitleCase).toEqual(titleCase))
  })
  //
  describe('Arrays', async () => {
    //
    const stringArrayWithDuplicates = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const stringArrayWithoutDuplicates = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    it('- check for duplicates within string arrays', async () => {
      expect(util.stringArrayHasDuplicates(stringArrayWithDuplicates)).toEqual(true)
      expect(util.stringArrayHasDuplicates(stringArrayWithoutDuplicates)).toEqual(false)
    })
  })
  //
  describe('JSON', async () => {
    //
    const stringIsJson = '{"a":1,"b":2,"c":3}'
    const stringIsNotJson01 = '{a:1,b:2,c:3}'
    const stringIsNotJson02 = '"a":1,"b":2,"c":3'
    const stringIsNotJson03 = '{"a":1,"b":2,"c":3'
    it('- check if string is JSON', async () => {
      expect(util.isStringJson(stringIsJson)).toEqual(true)
      expect(util.isStringJson(stringIsNotJson01)).toEqual(false)
      expect(util.isStringJson(stringIsNotJson02)).toEqual(false)
      expect(util.isStringJson(stringIsNotJson03)).toEqual(false)
    })
    //
    const looseJson = '{"a":1,"b":2,"c":3}'
    const parsedJson = { a: 1, b: 2, c: 3 }
    it('- parse loose JSON', async () => expect(util.looseJSONparse(looseJson)).toEqual(parsedJson))
    //
    const testInput = { a: true, b: 'two', c: 3 }
    const testResult = util.convertObjectToJsonString(testInput)
    const expectedResult = '{ a: true, b: "two", c: 3, }'
    it('- convert object to a JSON string', async () => expect(testResult).toEqual(expectedResult))
  })
  //
  describe('Infer Value Types', async () => {
    //
    const testInput01a = [ undefined, 'clayton', 3, true, {}, []]
    const testInput01b = [ 'string', 'number', 'boolean', 'UUID', 'object', 'array']
    const testResults01a = testInput01a.map(util.inferValueType)
    const testResults01b = testInput01b.map(util.inferValueType)
    const expectedResults01a = [ 'undefined', 'string', 'number', 'boolean', 'object', 'array']
    const expectedResults01b = [ 'string', 'number', 'boolean', 'UUID', 'object', 'array']
    it('- infer value type keyword', async () => {
      expect(testResults01a).toEqual(expectedResults01a)
      expect(testResults01b).toEqual(expectedResults01b)
    })
    //
    const testInput02a = [ 'clayton', 3, true ]
    const testInput02b = [ 'string', 'number', 'boolean', 'UUID']
    const testResults02a = testInput02a.map(util.inferGraphQLValueType)
    const testResults02b = testInput02b.map(util.inferGraphQLValueType)
    const expectedResults02a = [ 'String', 'Float', 'Boolean' ]
    const expectedResults02b = [ 'String', 'Float', 'Boolean', 'ID' ]
    it('- infer graphQL value type', async () => {
      expect(testResults02a).toEqual(expectedResults02a)
      expect(testResults02b).toEqual(expectedResults02b)
    })
    //
    const testInput03a = [ 'string', 'number', 'boolean', 'UUID', 'object', 'array']
    const testInput03b = [ 'clayton', 'is', 1, 'cool', false]
    const testResults03a = testInput03a.map(util.valueIsTypeKeyword)
    const testResults03b = testInput03b.map(util.valueIsTypeKeyword)
    const expectedResults03a = [ true, true, true, true, true, true]
    const expectedResults03b = [ false, false, false, false, false]
    it('- check if value is a type keyword', async () => {
      expect(testResults03a).toEqual(expectedResults03a)
      expect(testResults03b).toEqual(expectedResults03b)
    })
    //
    const testInput04 = { valueOne: undefined, valueTwo: 'clayton', valueThree: 3, valueFour: true, valueFive: {}, valueSix: [] }
    const testResults04 = []
    const expectedResults04 = [
      { name: 'valueOne', types: ['undefined'] },
      { name: 'valueTwo', types: ['string'] },
      { name: 'valueThree', types: ['number'] },
      { name: 'valueFour', types: ['boolean'] },
      { name: 'valueFive', types: ['object'] },
      { name: 'valueSix', types: ['array'] },
    ]
    for (const [key, value] of Object.entries(testInput04)) testResults04.push(util.convertKeyValueToNameAndType(key, value))
    it("- convert object key+value to 'name': key and 'types': [ valueType ]", async () => expect(testResults04).toEqual(expectedResults04))
  })
  //
  describe('Delay', async () => {
    //
    const delayStartTime = Date.now()
    await util.delay(1000)
    const delayEndTime = Date.now()
    it('- delay for 1 second', async () => expect(delayEndTime - delayStartTime).toBeGreaterThanOrEqual(1000))
    //
    const tryFunction = async (): Promise<string> => { await util.delay(1000); return 'success' }
    const waitStartTime = Date.now()
    const testWait = await util.waitForIt(tryFunction, (result) => result === 'success')
    const waitEndTime = Date.now()
    it('- wait for a function to return a value', async () => {
      expect(waitEndTime - waitStartTime).toBeGreaterThanOrEqual(1000)
      expect(testWait).toEqual('success')
    })

  })
  //
})
