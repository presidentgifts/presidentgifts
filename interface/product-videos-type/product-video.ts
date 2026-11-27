export interface ProductVideoProps {
  id: string | number;
  video: string;
  /** Opens when the video is clicked (e.g. an Instagram reel); no link means the card is not clickable. */
  instaLink?: string | null;
}
