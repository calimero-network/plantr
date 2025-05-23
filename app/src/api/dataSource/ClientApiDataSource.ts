import {
  ApiResponse,
  JsonRpcClient,
  WsSubscriptionsClient,
  RpcError,
  handleRpcError,
  getAppEndpointKey,
  getAuthConfig,
} from '@calimero-network/calimero-client';
import {
  ClientApi,
  ClientMethod,
  CreateEventResponse,
  DeleteEventResponse,
  GetEventsResponse,
  IEventJsonRpc,
  UpdateEventResponse,
} from '../clientApi';
import { IEvent, IEventCreate, TPartialEvent } from '../../types/event';
import parseEvents from '../../utils/helpers/parseEvents';

export function getJsonRpcClient() {
  const appEndpointKey = getAppEndpointKey();
  if (!appEndpointKey) {
    throw new Error(
      'Application endpoint key is missing. Please check your configuration.',
    );
  }
  return new JsonRpcClient(appEndpointKey, '/jsonrpc');
}

export function getWsSubscriptionsClient() {
  const appEndpointKey = getAppEndpointKey();
  if (!appEndpointKey) {
    throw new Error(
      'Application endpoint key is missing. Please check your configuration.',
    );
  }
  return new WsSubscriptionsClient(appEndpointKey, '/ws');
}

export class ClientApiDataSource implements ClientApi {
  private async handleError(
    error: RpcError,
    params: any,
    callbackFunction: any,
  ) {
    if (error && error.code) {
      const response = await handleRpcError(error, getAppEndpointKey);
      if (response.code === 403) {
        return await callbackFunction(params);
      }
      return {
        error: await handleRpcError(error, getAppEndpointKey),
      };
    }
  }

  async getEvents(): ApiResponse<GetEventsResponse> {
    try {
      const config = getAuthConfig();

      if (!config || !config.contextId || !config.executorPublicKey) {
        return {
          data: null,
          error: {
            code: 500,
            message: 'Authentication configuration not found',
          },
        };
      }

      const response = await getJsonRpcClient().execute<any, GetEventsResponse>(
        {
          contextId: config.contextId,
          method: ClientMethod.GET_EVENTS,
          argsJson: {},
          executorPublicKey: config.executorPublicKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      if (response?.error) {
        return await this.handleError(response.error, {}, this.getEvents);
      }

      let events: IEvent[] = parseEvents(
        (response?.result.output as IEventJsonRpc[]) ?? [],
      );

      return {
        data: events,
        error: null,
      };
    } catch (error) {
      console.error('getEvents failed:', error);
      let errorMessage = 'An unexpected error occurred during getEvents';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  async createEvent(event: IEventCreate): ApiResponse<CreateEventResponse> {
    try {
      const config = getAuthConfig();

      if (!config || !config.contextId || !config.executorPublicKey) {
        return {
          data: null,
          error: {
            code: 500,
            message: 'Authentication configuration not found',
          },
        };
      }

      const response = await getJsonRpcClient().execute<
        any,
        CreateEventResponse
      >(
        {
          contextId: config.contextId,
          method: ClientMethod.CREATE_EVENT,
          argsJson: {
            event_data: {
              color: event.color,
              description: event.description,
              end: event.end,
              start: event.start,
              title: event.title,
              event_type: event.type,
              peers: event.peers.length > 0 ? event.peers.split(', ') : [],
            },
          },
          executorPublicKey: config.executorPublicKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (response?.error) {
        return await this.handleError(response.error, {}, this.createEvent);
      }

      const eventId = response?.result?.output;

      if (!eventId) {
        return {
          error: {
            code: 500,
            message: 'Event ID is missing',
          },
        };
      }

      return {
        data: eventId,
        error: null,
      };
    } catch (error) {
      console.error('createEvent failed:', error);
      let errorMessage = 'An unexpected error occurred during createEvent';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  async deleteEvent(eventId: string): ApiResponse<DeleteEventResponse> {
    try {
      const config = getAuthConfig();

      if (!config || !config.contextId || !config.executorPublicKey) {
        return {
          data: null,
          error: {
            code: 500,
            message: 'Authentication configuration not found',
          },
        };
      }

      const response = await getJsonRpcClient().execute<
        any,
        DeleteEventResponse
      >(
        {
          contextId: config.contextId,
          method: ClientMethod.DELETE_EVENT,
          argsJson: { event_id: eventId },
          executorPublicKey: config.executorPublicKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      if (response?.error) {
        return await this.handleError(response.error, {}, this.deleteEvent);
      }

      const eventIdResponse = response?.result?.output;

      if (!eventIdResponse) {
        return {
          error: {
            code: 500,
            message: 'Event ID is missing',
          },
        };
      }

      return {
        data: eventIdResponse,
        error: null,
      };
    } catch (error) {
      console.error('deleteEvent failed:', error);
      let errorMessage = 'An unexpected error occurred during deleteEvent';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }

  async updateEvent(
    eventId: string,
    eventData: TPartialEvent,
  ): ApiResponse<UpdateEventResponse> {
    try {
      const config = getAuthConfig();

      if (!config || !config.contextId || !config.executorPublicKey) {
        return {
          data: null,
          error: {
            code: 500,
            message: 'Authentication configuration not found',
          },
        };
      }

      const response = await getJsonRpcClient().execute<
        any,
        UpdateEventResponse
      >(
        {
          contextId: config.contextId,
          method: ClientMethod.UPDATE_EVENT,
          argsJson: {
            event_id: eventId,
            event_data: {
              color: eventData.color ?? null,
              description: eventData.description ?? null,
              end: eventData.end ?? null,
              start: eventData.start ?? null,
              title: eventData.title ?? null,
              event_type: eventData.type ?? null,
              peers:
                eventData.peers && eventData.peers?.length > 0
                  ? eventData.peers.split(', ')
                  : [],
            },
          },
          executorPublicKey: config.executorPublicKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      if (response?.error) {
        return await this.handleError(response.error, {}, this.updateEvent);
      }

      const eventIdResponse = response?.result?.output;

      if (!eventIdResponse) {
        return {
          error: {
            code: 500,
            message: 'Event ID is missing',
          },
        };
      }

      return {
        data: eventIdResponse,
        error: null,
      };
    } catch (error) {
      console.error('updateEvent failed:', error);
      let errorMessage = 'An unexpected error occurred during updateEvent';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        error: {
          code: 500,
          message: errorMessage,
        },
      };
    }
  }
}
