export const formatWalletAddress = (address: string): `0x${string}` => {
  const lower = address.toLowerCase();
  return lower.startsWith("0x")
    ? (lower as `0x${string}`)
    : (`0x${lower}` as `0x${string}`);
};
