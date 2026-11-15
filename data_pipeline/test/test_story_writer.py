"""The AI story safety check (ai/story_writer.py). Never calls the real API."""
import ai.story_writer as sw
import pipeline as p


def test_invented_numbers_are_caught():
    facts = {"then": 39, "now": 57, "years": [2001, 2005]}
    assert sw.unknown_numbers({"text": "From 39 to 57 days since 2001."}, facts) == []
    assert 47.3 in sw.unknown_numbers({"text": "47.3 more days by 2040"}, facts)


def test_rounding_is_allowed():
    assert sw.unknown_numbers({"text": "about 8 days"}, {"x": 7.9}) == []


def test_no_api_key_falls_back_to_template(daily, fake_extra, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    rep = p.build_report(33.45, -112.07, daily=daily, extra=fake_extra)
    story = sw.write_story(rep, use_cache=False)
    assert story["source"] == "template" and story["factor_sentences"]
