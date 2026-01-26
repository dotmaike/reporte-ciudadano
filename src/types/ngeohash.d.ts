declare module 'ngeohash' {
  /**
   * Encode a latitude and longitude into a geohash string
   */
  export function encode(latitude: number, longitude: number, precision?: number): string;

  /**
   * Decode a geohash string into coordinates
   */
  export function decode(hash: string): {
    latitude: number;
    longitude: number;
  };

  /**
   * Get the bounding box for a geohash
   */
  export function decode_bbox(hash: string): [number, number, number, number];

  /**
   * Get all neighboring geohashes
   */
  export function neighbors(hash: string): {
    n: string;
    ne: string;
    e: string;
    se: string;
    s: string;
    sw: string;
    w: string;
    nw: string;
  };

  /**
   * Get a specific neighbor
   */
  export function neighbor(hash: string, direction: [number, number]): string;

  /**
   * Get all geohashes within a bounding box
   */
  export function bboxes(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    precision?: number,
  ): string[];
}
