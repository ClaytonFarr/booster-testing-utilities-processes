/* eslint-disable prettier/prettier */
import { describe, it, expect } from 'vitest'
import * as auth from '../helpers-authorization'

// Test Inputs
// ====================================================================================

const assertedAuthorization01 = ''
const assertedAuthorization02 = 'all'
const assertedAuthorization03 = ['User']
const assertedAuthorization04 = ['all', 'User']
const assertedAuthorization05 = ['User', 'Admin', 'ThirdPartyService']

// Tests
// ====================================================================================

describe('Process - Authorization Helpers', async () => {

  describe('Authorization', async () => {
    //
    it('- check if authorized request was rejected', async () => {
      // LATER: determine how to set up local test content & server to evaluate GraphQL queries
      expect(true).toEqual(true)
    })
  })

  describe('Roles', async () => {
    //
    const allCheck01 = auth.arrayIncludesAll(assertedAuthorization01)
    const allCheck02 = auth.arrayIncludesAll(assertedAuthorization02)
    const allCheck03 = auth.arrayIncludesAll(assertedAuthorization03)
    const allCheck04 = auth.arrayIncludesAll(assertedAuthorization04)
    const allCheck05 = auth.arrayIncludesAll(assertedAuthorization05)
    it("'- check if authorization array includes 'all'", async () => {
      expect(allCheck01).toEqual(false)
      expect(allCheck02).toEqual(true)
      expect(allCheck03).toEqual(false)
      expect(allCheck04).toEqual(true)
      expect(allCheck05).toEqual(false)
    })
    //
    const rolesCheck01 = auth.gatherAssertedRoles(assertedAuthorization01)
    const expectedRoles01 = []
    const rolesCheck02 = auth.gatherAssertedRoles(assertedAuthorization02)
    const expectedRoles02 = ['all']
    const rolesCheck03 = auth.gatherAssertedRoles(assertedAuthorization03)
    const expectedRoles03 = ['User']
    const rolesCheck04 = auth.gatherAssertedRoles(assertedAuthorization04)
    const expectedRoles04 = ['all']
    const rolesCheck05 = auth.gatherAssertedRoles(assertedAuthorization05)
    const expectedRoles05 = ['User', 'Admin', 'ThirdPartyService']
    it("'- gather asserted roles", async () => {
      expect(rolesCheck01).toEqual(expectedRoles01)
      expect(rolesCheck02).toEqual(expectedRoles02)
      expect(rolesCheck03).toEqual(expectedRoles03)
      expect(rolesCheck04).toEqual(expectedRoles04)
      expect(rolesCheck05).toEqual(expectedRoles05)
    })
  })
//
})
