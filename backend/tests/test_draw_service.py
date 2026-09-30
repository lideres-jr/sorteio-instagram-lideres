import asyncio
import random
import unittest

from app.models import CommentEntry, CommentSource
from app.repositories.memory import InMemoryDrawRepository
from app.services.draw import DrawService, NoEligibleEntriesError


class DrawServiceTests(unittest.TestCase):
    def test_manual_entries_are_not_deduplicated(self) -> None:
        comments = DrawService.parse_manual_comments(
            "@ana | primeiro\n@ana | segundo\n@bruno; terceiro"
        )
        self.assertEqual([item.username for item in comments], ["ana", "ana", "bruno"])

    def test_drawn_username_is_not_repeated(self) -> None:
        async def scenario() -> None:
            repository = InMemoryDrawRepository()
            await repository.save_comments(
                [
                    CommentEntry(username="ana", source=CommentSource.MANUAL),
                    CommentEntry(username="ana", source=CommentSource.MANUAL),
                    CommentEntry(username="bruno", source=CommentSource.MANUAL),
                ]
            )
            service = DrawService(repository, random.Random(1))
            first = await service.draw()
            second = await service.draw()
            self.assertNotEqual(first.username, second.username)
            with self.assertRaises(NoEligibleEntriesError):
                await service.draw()

        asyncio.run(scenario())

    def test_instagram_import_is_idempotent(self) -> None:
        async def scenario() -> None:
            repository = InMemoryDrawRepository()
            entry = CommentEntry(
                external_id="comment-1",
                username="ana",
                source=CommentSource.INSTAGRAM,
            )
            self.assertEqual(await repository.save_comments([entry]), 1)
            self.assertEqual(await repository.save_comments([entry]), 0)

        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main()

