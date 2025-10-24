import { getRandomValues } from "node:crypto";
import { fromString, toString } from "uint8arrays";

export class CryptoUtils {
  /** Generate a random encryption key in hex format */
  static generateEncryptionKeyHex(): string {
    return toString(getRandomValues(new Uint8Array(32)), "hex");
  }

  /** Convert a hex string to a Uint8Array encryption key */
  static getEncryptionKeyFromHex(hex: string): Uint8Array {
    return fromString(hex, "hex");
  }
}
