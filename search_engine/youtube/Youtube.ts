import YTMusic from 'ytmusic-api';
import log from '../../utils/logger'; // Assuming this path is correct for your project

/**
 * Interface for the data structure of a song returned by YTMusic API.
 */
interface SongData {
  artist: { name: string };
  name: string;
  thumbnails: { url: string }[];
  videoId: string;
}

/**
 * Interface for the successful lyrics response.
 */
interface LyricsResponse {
  artist_name: string;
  track_name: string;
  search_engine: string;
  artwork_url: string;
  lyrics: string;
}

/**
 * Interface for an error response.
 */
interface ErrorResponse {
  message: string;
  response: string; // HTTP-like status message
}

/**
 * A class to interact with YouTube Music API to fetch song lyrics.
 */
class Youtube {
  private ytm: YTMusic;
  private initialized: boolean = false; // Flag to track if YTMusic is initialized

  /**
   * Constructor for the Youtube class.
   * Initializes the YTMusic API instance.
   */
  constructor() {
    this.ytm = new YTMusic();
  }

  /**
   * Ensures that the YTMusic API is initialized.
   * This method is called before any API operations to prevent redundant initializations.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      log.info('Initializing YTMusic API...');
      await this.ytm.initialize();
      this.initialized = true;
      log.info('YTMusic API initialized.');
    }
  }

  /**
   * Fetches lyrics for a given song title from YouTube Music.
   * @param title The title of the song to search for.
   * @returns A Promise that resolves to either LyricsResponse on success or ErrorResponse on failure.
   */
  async getLyrics(title: string): Promise<LyricsResponse | ErrorResponse> {
    try {
      // Ensure YTMusic API is initialized before proceeding
      await this.ensureInitialized();

      log.info(`Searching for song: "${title}"`);
      const song: SongData[] = await this.ytm.searchSongs(title);

      // Handle case where no songs are found for the given title
      if (!song || song.length === 0) {
        log.warn(`No songs found for title: "${title}"`);
        return {
          message: 'No songs found for the given title.',
          response: '404 Not Found',
        };
      }

      const data = song[0]; // Take the first search result
      log.info(`Found song: "${data.name}" by "${data.artist.name}" (Video ID: ${data.videoId})`);

      const artist_name = data.artist.name;
      const track_name = data.name;
      const search_engine = 'YouTube';

      // Safely access artwork URL, preferring the second thumbnail if available, otherwise the first, or an empty string
      const artwork_url = data.thumbnails && data.thumbnails.length > 1
        ? data.thumbnails[1].url
        : (data.thumbnails && data.thumbnails.length > 0
          ? data.thumbnails[0].url
          : ''); // Provide an empty string if no thumbnails are available

      const video_id = data.videoId;

      log.info(`Fetching lyrics for video ID: ${video_id}`);
      // The YTMusic API's getLyrics method can return various types.
      // We need to handle both string[] and potentially a single string or other structures.
      const lyrics_data: string | string[] | null = await this.ytm.getLyrics(video_id);
      let lyrics: string;

      if (Array.isArray(lyrics_data)) {
        lyrics = lyrics_data.join('\n');
        log.info('Lyrics fetched successfully (array format).');
      } else if (typeof lyrics_data === 'string' && lyrics_data.trim() !== '') {
        lyrics = lyrics_data;
        log.info('Lyrics fetched successfully (string format).');
      } else {
        // If lyrics_data is null, undefined, or an empty string/array
        log.warn(`No lyrics content found for video ID: ${video_id}. Received:`, lyrics_data);
        lyrics = 'No lyrics available for this song.';
      }

      return { artist_name, track_name, search_engine, artwork_url, lyrics };

    } catch (error) {
      // Log the full error object for better debugging
      log.error('Error in Youtube.getLyrics:', error);

      // Provide a more general error message for internal issues
      return {
        message: 'An internal error occurred while fetching lyrics.',
        response: '500 Internal Server Error',
      };
    }
  }
}

export default Youtube;
