import Checkin from '../models/checkIn';

export type GroupChat = {
  chatInstance: string;
  chatId: string;
};

/**
 * Every group we have ever seen a check-in from, paired with its most recent chat id.
 */
export async function getGroupChats(): Promise<GroupChat[]> {
  const groups = await Checkin.aggregate([
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: '$chat_instance',
        chatId: { $last: '$chat_id' },
      },
    },
    {
      $match: {
        _id: { $ne: null },
        chatId: { $nin: [null, ''] },
      },
    },
  ]);

  return groups
    .filter((group) => group?._id && group?.chatId)
    .map((group) => ({ chatInstance: group._id, chatId: group.chatId }));
}
