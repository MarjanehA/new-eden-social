import { Injectable } from '@nestjs/common';
import { Post } from './post.entity';
import { VCreatePost } from './post.validate';
import { Character } from '../character/character.entity';
import { Killmail } from '../killmail/killmail.entity';
import { POST_TYPES } from './post.constants';
import { CorporationService } from '../corporation/corporation.service';
import { CharacterService } from '../character/character.service';
import { Corporation } from '../corporation/corporation.entity';
import { Alliance } from '../alliance/alliance.entity';
import { AllianceService } from '../alliance/alliance.service';
import { HashtagService } from '../hashtag/hashtag.service';
import { ESIEntetyNotFoundException } from '../core/external/esi/esi.exceptions';
import { UniverseLocationService } from '../universe/location/location.service';
import { LoggerService } from '../core/logger/logger.service';
import { PostRepository } from './post.repository';
import { CommandBus } from '@nestjs/cqrs';
import { CreatePostCommand } from './commands/create.command';
import { InjectRepository } from '@nestjs/typeorm';
import { MetascraperService } from '../metascraper/metascraper.service';

@Injectable()
export class PostService {

  constructor(
    private corporationService: CorporationService,
    private characterService: CharacterService,
    private allianceService: AllianceService,
    private hashtagService: HashtagService,
    private universeLocationService: UniverseLocationService,
    private loggerService: LoggerService,
    private metascraperService: MetascraperService,
    private commandBus: CommandBus,
    @InjectRepository(PostRepository)
    private postRepository: PostRepository,
  ) {
  }

  /**
   * Get single Post
   * @param id
   * @return {Promise<Post>}
   */
  public async get(id: string): Promise<Post> {
    return this.postRepository.findOne(id);
  }

  /**
   * Create Post as character
   * @param {VCreatePost} postData
   * @param {Character} character
   * @return {Promise<Post>}
   */
  public async createAsCharacter(
    postData: VCreatePost,
    character: Character,
  ): Promise<Post> {
    const post = new Post();
    post.content = postData.content;
    post.type = postData.type;
    post.character = character;

    return this.create(post, postData);
  }

  /**
   * Create Post as corporation
   * @param {VCreatePost} postData
   * @param {Corporation} corporation
   * @return {Promise<Post>}
   */
  public async createAsCorporation(
    postData: VCreatePost,
    corporation: Corporation,
  ): Promise<Post> {
    const post = new Post();
    post.content = postData.content;
    post.type = postData.type;
    post.corporation = corporation;

    return this.create(post, postData);
  }

  /**
   * Create Post as alliance
   * @param {VCreatePost} postData
   * @param {Alliance} alliance
   * @return {Promise<Post>}
   */
  public async createAsAlliance(
    postData: VCreatePost,
    alliance: Alliance,
  ): Promise<Post> {
    const post = new Post();
    post.content = postData.content;
    post.type = postData.type;
    post.alliance = alliance;

    return this.create(post, postData);
  }

  /**
   * Get character wall
   * @param {Character} character
   * @param {Number} limit
   * @param {Number} page
   * @return {Promise<Post[]>}
   */
  public async getCharacterWall(
    character: Character,
    limit = 10,
    page = 0,
  ): Promise<{ posts: Post[], count: number }> {
    const [posts, count] = await this.postRepository.getCharacterWall(character, limit, page);

    return { posts, count };
  }

  /**
   * Get corporation wall
   * @param {Corporation} corporation
   * @param {Number} limit
   * @param {Number} page
   * @return {Promise<Post[]>}
   */
  public async getCorporationWall(
    corporation: Corporation,
    limit = 10,
    page = 0,
  ): Promise<{ posts: Post[], count: number }> {
    const [posts, count] = await this.postRepository.getCorporationWall(corporation, limit, page);

    return { posts, count };
  }

  /**
   * Get alliance wall
   * @param {Alliance} alliance
   * @param {Number} limit
   * @param {Number} page
   * @return {Promise<Post[]>}
   */
  public async getAllianceWall(
    alliance: Alliance,
    limit = 10,
    page = 0,
  ): Promise<{ posts: Post[], count: number }> {
    const [posts, count] = await this.postRepository.getAllianceWall(alliance, limit, page);

    return { posts, count };
  }

  /**
   * Get all posts for specific hashtag
   * @param {string} hashtag
   * @param {number} limit
   * @param {number} page
   * @returns {Promise<{posts: Post[]; count: number}>}
   */
  public async getByHashtag(
    hashtag: string,
    limit = 10,
    page = 0,
  ): Promise<{ posts: Post[], count: number }> {
    const [posts, count] = await this.postRepository.getByHashtag(hashtag, limit, page);

    return { posts, count };
  }

  /**
   * Get all posts for specific location
   * @param {number} locationId
   * @param {number} limit
   * @param {number} page
   * @returns {Promise<{posts: Post[]; count: number}>}
   */
  public async getByLocation(
    locationId: number,
    limit = 10,
    page = 0,
  ): Promise<{ posts: Post[], count: number }> {
    const [posts, count] = await this.postRepository.getByLocation(locationId, limit, page);

    return { posts, count };
  }

  /**
   * Get latest posts
   * @param {Number} limit
   * @param {Number} page
   * @return {Promise<Post[]>}
   */
  public async getLatest(
    limit = 10,
    page = 0,
  ): Promise<{ posts: Post[], count: number }> {
    const [posts, count] = await this.postRepository.getLatest(limit, page);

    return { posts, count };
  }

  /**
   * Create killmail post
   * @param {Killmail} killmail
   * @param {Character} finalBlow
   * @return {Promise<Post>}
   */
  public async createKillmailPost(killmail: Killmail, finalBlow: Character): Promise<Post> {
    const post = new Post();
    post.type = POST_TYPES.KILLMAIL;
    post.killmail = killmail;
    post.character = finalBlow;
    post.createdAt = killmail.createdAt;

    if (killmail.locationId) {
      try {
        post.location = await this.universeLocationService.get(killmail.locationId);
      } catch (e) {
        if (e instanceof ESIEntetyNotFoundException) {
          this.loggerService.warning('locationId was not found!');
        }
        else throw e;
      }
    }

    return post.create();
  }

  public async getParticipants(
    post: Post,
  ): Promise<{ characters: Character[], corporations: Corporation[], alliances: Alliance[] }> {
    return this.postRepository.getParticipants(post);
  }

  public async getNumOfPostsByCharacter(
    character: Character,
  ): Promise<number> {
    return this.postRepository.getNumOfPostsByCharacter(character);
  }

  public async getNumOfPostsByCorporation(
    corporation: Corporation,
  ): Promise<number> {
    return this.postRepository.getNumOfPostsByCorporation(corporation);
  }

  public async getNumOfPostsByAlliance(
    alliance: Alliance,
  ): Promise<number> {
    return this.postRepository.getNumOfPostsByAlliance(alliance);
  }

  /**
   * Create post
   * @param {Post} post
   * @param {VCreatePost} postData
   * @returns {Promise<Post>}
   */
  private async create(post: Post, postData: VCreatePost): Promise<Post> {
    if (postData.allianceId) {
      post.allianceWall = await this.allianceService.get(postData.allianceId);
    }

    if (postData.corporationId) {
      post.corporationWall = await this.corporationService.get(postData.corporationId);
    }

    if (postData.characterId) {
      post.characterWall = await this.characterService.get(postData.characterId);
    }

    if (postData.locationId) {
      post.location = await this.universeLocationService.get(postData.locationId);
    }

    if (postData.url) {
      const urlMetadata = await this.metascraperService.processUrl(postData.url);
      post.url = urlMetadata;

      if (this.metascraperService.isUrlmetaForKillmail(urlMetadata)) {
        const killmail = await this.metascraperService.processKillmail(urlMetadata.url);
        post.killmail = killmail;
      }
    }

    post.hashtags = await this.hashtagService.parse(post.content);

    return this.commandBus.execute(
      new CreatePostCommand(post),
    );
  }
}
