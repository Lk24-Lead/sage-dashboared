#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = [
#   "fastapi>=0.110",
#   "uvicorn[standard]>=0.29",
#   "databricks-sdk>=0.30",
#   "python-dotenv>=1.0",
# ]
# ///
"""
India Next — FastAPI backend
Serves /api/data (live Databricks query) + /api/health
Frontend is served as static files from ./webapp/dist
Run:  uv run server.py
"""

import os
import asyncio
import logging
from pathlib import Path as _Path
_dotenv = _Path(__file__).parent / ".env"
if _dotenv.exists():
    from dotenv import load_dotenv
    load_dotenv(_dotenv)
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState, Disposition, Format

log = logging.getLogger("india_next")

HERE  = Path(__file__).resolve().parent

# Webapp: local dev uses webapp/dist, deployed build uses ./dist
WEBAPP = (HERE / "webapp" / "dist") if (HERE / "webapp" / "dist").exists() else (HERE / "dist")

# Databricks config — auto-detected when running as a Databricks App
# Falls back to env vars for local dev
DBR_HOST         = os.environ.get("DATABRICKS_HOST", "https://swiggy-analytics-mumbai.cloud.databricks.com")
DBR_TOKEN        = os.environ.get("DATABRICKS_TOKEN", "")
DBR_WAREHOUSE_ID = os.environ.get("DATABRICKS_WAREHOUSE_ID", "c5b794bff6539d09")

def get_client() -> WorkspaceClient:
    # Inside a Databricks App: DATABRICKS_HOST + DATABRICKS_TOKEN are injected automatically
    if DBR_TOKEN:
        return WorkspaceClient(host=DBR_HOST, token=DBR_TOKEN)
    # Local dev: uses cached OAuth from ~/.databrickscfg
    return WorkspaceClient(host=DBR_HOST, profile="analytics-workspace")

# ── SQL ────────────────────────────────────────────────────────────────────────
EC_TEMPLATES = """
'e27d21a0-e4fa-4684-b31d-906ce7c5f276','02b3f695-33a4-4378-9f8b-ac52340daf2a',
'620a407d-0234-4b53-b1bb-37ec9e9228ac','e20e70b6-9daf-4229-a69c-240bece9e962',
'e412c31d-bea5-45e0-9c9e-5f36f0757613','d9df6bdc-3325-452f-9f5a-71c9a0fb392c',
'821a8b32-6aa3-4b2b-9d6a-9b3fcdbcbeb3','6733977d-aa5b-440a-9f10-3c9891cd6d79',
'b3f86463-59d5-4eda-b912-3b078fb5a8bb','fdd870a6-76dd-4d2e-8927-b147b6475c21',
'055b8e44-f83e-4f35-98b8-6f62f4ed368f','bcc9dd09-cef5-4067-a26a-1d7f7ce5d07b',
'8fe39c02-e98d-43dc-9a17-6a981b0ce0e2','0f2e28fe-7a63-47be-a784-b58e19da3165',
'1ef830a0-90a9-44dc-95cd-127ef6fe4aad','9c4ae49d-4b57-44e5-8522-88b9a7c44a31',
'2d08a55b-31af-4012-8b35-0fcc72d09775','0459758d-7731-4997-808a-928f328de241',
'c72c8a62-8d54-4433-b3df-083709fd2f98','6ab86fb0-dac5-451d-a4c1-2830c3a52c3b',
'd44dd0e8-5949-47b6-a932-6761a4efa12c','5929b835-1609-456e-b996-db078925f838',
'4d8d2b73-28b9-4772-9c11-6e68ae076aa6','5a521234-2f3b-42e5-8488-02b3fec23d6c',
'6f39a8d9-0ca2-491c-a997-59ad8229bec4','500e91fb-8f09-4dde-bac1-66bf9914f9f2',
'5f51b719-49b5-4735-ab6c-5b0959a97444','db93903e-4569-4871-9024-a1ad8fcd712c',
'9f34ea9c-681f-4160-aa85-c94ed6ba0e88','c62bcee1-e2ed-4ce5-9e51-f8c0b5bcae4d',
'2d1d221d-ff93-4a4a-802f-ebd21428d0f4','70c2808b-0d8f-47f6-a1b5-2cb5b73dc6a4',
'8398d02c-06e2-405b-98cc-142a0b61c57c','607540c2-c1ad-4671-b921-333100723c5e',
'aafc4b97-90bf-44da-bd41-479518b4101a','c40ee550-4eb6-401d-824f-2d225ea64aef',
'e133479f-cac0-42a8-a303-edfa6ee088b9','845d8add-2b43-4a20-a096-4250dc0279e2',
'a769d000-2bf7-4fd4-b9d0-e23faf7496ef','16f5f84b-6192-4578-ae74-339c0d4a8bff',
'21688135-7a10-4bde-a295-5c5d950a4337','9f1a44f4-ad44-4fc1-80e5-1d45f69eaff1',
'0f179e08-9bcd-4948-8298-b38230cbc8fd','1ad31b90-a581-4bea-821d-2ecf4c80a83c',
'f1764ce0-8d7c-4edf-8670-bd6fb7e132a9','9792a323-a44b-4dd9-bc2a-8d0a31de14d2',
'79127110-ec30-488f-b786-9c5d368ee907','810bbb9d-0ccc-4221-a0d1-d086a7fe5aee',
'48743979-5f7d-4530-b5e6-bbcebff3c118','49072963-8c41-410f-96ce-e181c7accebd',
'6a310cf7-2dd9-47f4-a7cc-2530742030af','4eacc37f-9f7e-4e0a-8bd8-fe08c9587f3f',
'0d0f97a6-4232-42a6-ae90-12bb9a674e7b','fd8e84ef-2f52-4b1b-9696-c137b8bc78e0',
'20e0146d-fe80-492c-9351-c346f78da60b','1f1cac91-7169-4063-a89d-49db1013e3bc',
'f0db5216-4bc7-4f5f-a927-454eba9bb677','deaa5373-defd-4da5-9e84-20e1a5f0d9d1',
'57c5a229-3c39-45db-a679-de2ba1710bba','cc5e6fb5-552f-4d2f-9e1c-1dfa87d11a1a',
'3982a3c3-65af-43dd-83a2-e43d8feae221','429f688c-f659-494d-85f4-9cd44f273499',
'05076fe3-e71d-429c-87a9-a0831c8e17e9','5e37e24e-579b-4414-ba2a-6c3b0ac30e7d',
'b3e7e4da-6941-408a-aa07-1d031e3196f6','c28e4e8f-2ce4-402c-ac3a-9f7077cd095a',
'03098923-ebf1-41de-8dac-dcdccea0ba6a','43c5cc2c-7159-4c5c-b40c-69a25645d515',
'd2b5ebb7-bf75-4274-b39c-bb85a15f2428','d99bd5d1-01e1-4b29-9067-057b8651435f',
'2e775dd6-badc-4764-8504-f173d4899e68','78ca34ec-fa50-48fa-a8bf-d47189338117',
'6a4b2877-e5c7-48c3-a91d-a838b7c8e52f','fa9354a6-4363-4d1c-b205-a9689cd3813f',
'2cc1daba-934f-478f-a78d-595c56a639ff','6610711d-c3b9-4da2-b724-a227c6f49f0c',
'3c06cfc4-2e04-48c6-b2b6-8bd9f3640415','c033aa90-2559-4204-9057-72e82efb2319',
'c9e49dac-f55e-4bf2-a8d6-93fc914a7667','a6dd1c64-3e9e-43d7-ad4d-60417d6d436a',
'2e1e9e43-014e-4961-9b58-21d21a646360','b1fe1afa-6010-4389-bcb9-2a6597d6eed7',
'723ef114-b559-4391-9c7e-9c2094d2dc42','4c069713-749f-4199-95c1-ca992951586f',
'efbc28a1-fe91-4bd4-9944-dd0c1e70f057','8d9898a7-8cf8-4767-8c87-572757897e80',
'8e75cdae-ed11-4cdd-91ab-82a085b0d094','bf05eee2-e9e0-41f4-b91a-9e781c051789',
'58d86338-c549-45e0-b43f-694c90bc0cb1','d852aed9-ac71-4348-bee5-12b359206a49',
'99c2e38c-cfbc-44ae-a7f9-d4094ba6aa4a','c55f3e8e-580c-4bfa-bb16-21095574a856',
'1c97ba78-30aa-4a4f-8ec7-966dc984c502','95be5ce5-390d-4094-98a2-34611fa396a3',
'f2458998-a88b-4b17-8ed7-b32720774825','1c121f79-5a16-4189-9b56-31502b8fbfa1',
'5cd634d1-9488-4510-8a36-07d07902be8c','5f0f0276-c556-42d0-bd40-56b883ca52e8',
'c6eb7e4c-b343-4264-a7b7-cf463d105af6','48efc476-c517-4c3c-b6df-8f1997454bfc',
'810f4b3a-ff3f-42d7-af77-2fdb5e62684c','05848cc1-a107-4d03-a1a9-e368ab84c9be',
'17ebcb67-dc3a-400d-88dc-ced96472459c','bb6e8aa1-09ce-449d-97d5-301ce097d6e8',
'9d64e991-6885-4934-8390-abbe0a7afe74','d854e807-4418-4dc4-99f9-18a98ddd63d2',
'e4d59de9-4c0d-4850-88ed-d24f5a0e4820','0c71b6af-b1b2-4d48-82fe-6c0a7468ab43',
'a772b18d-7426-4717-b283-4e4d5744862a','d9748479-7af5-461a-bfc1-bccf2d8c6fd5',
'38527363-cff2-4943-b563-4183a6f8e57c','70f141cd-51ad-4f14-a2d6-a909b3b9f3a3',
'8c39f265-d302-415e-9193-cbdf5fcfc2d6','ec873c32-410c-4063-9cee-9855f94feaa1',
'27a283a1-a8a9-47b1-acbf-cea7f0791c57','74d35ba8-d506-4234-998c-9ac385dce7c8',
'af4237a8-00bb-4c56-bb2a-e35f1f655799','7016e376-b37c-47e4-a53a-f5ffaa42dda0',
'237f0cde-cb6f-4a5a-9afa-a8981806504a','42d18acd-33db-4f40-8de8-fd13baae9a14',
'673dd56f-4416-4926-965c-de2916b08811','00e5c0a2-0618-48f0-8cdd-d7530b265f71',
'ec0aca90-34af-40a7-9da8-2b8214abca2c','d811bfbc-45d3-4f3c-a469-12100b1e80fd',
'c0dab61d-0c43-4474-8fb2-bc3f32cd7856','0e8eb72c-d333-45d7-b738-1fff1a89b549',
'ad68574b-4d25-40d2-a708-af7657d9a685','6c8efbe0-48dd-4834-8b40-d07052399e55',
'd2a966df-ea64-4326-b1d6-88e7a4bd166c','7944ff86-aa6c-4456-bbb0-97d5201e6fc0',
'd2cfdc0d-5c1d-4aeb-88d3-10c33dbab9dd','80364850-b2ae-4ae5-89d6-bed6c57a2d02',
'01a7c497-8505-4848-96cb-63d4c734454b','ae2a74e6-9cad-4721-991a-bd222fef7bed',
'63706dff-ce76-4196-a132-e79889e64d69','492c4f71-9407-4771-8039-3c5675a05fe8',
'b46b5428-286e-4e59-a3d5-896a5e4f5c77','6ee38579-6df8-45a7-9b86-156215ac24bc',
'ed646ea2-c8d0-478b-86b4-94fa6a463762','f462c0ec-f9ba-490d-9e43-08c3f50315e3',
'd6bbfa91-6bf6-44fc-b8df-de6d34f5b395','5913ec30-7fd6-4d70-b494-9a23484bc605'
"""

STR_COUPONS = [
    'ONLY4U','MEAL4U','FLAT65%OFF','MAAFIA','SOCIETY300OFF','FLAT70%OFF4U',
    'FLAT70%OFF4YOU','FLAT65%OFF4U','OFFER4U','TREAT4U','SPECIAL4U','EXCLUSIVE4U_CT',
    'FLAT65%OFF4YOU','SECRET4U','BONUS4U','HNY2026','FLAT75%OFF4U','MAFIA',
    'SOCIETY150OFF','ONLY','FLAT75OFF2','BLEEDBLUE','VALUE4U','FLAT75OFF3',
    'LUV4U','EXCLUSIVE4U','NEWYEARSALE','GIFT4U','FOOD4U','FLAT70%OFF',
    'FLAT75%OFF4YOU','FLAT75%OFF','STUDENTOFFER','CHAKDEINDIA','DEAL4U',
    'FLAT75OFF1','HUNGER4U'
]

# City code lists from TEMP.PUBLIC.ALL_CITIES_VIEW_V3 (Snowflake) INDIA_TAGGING column
INDIA_2_CITIES = "17,21,22,35,37,40,41,42,43,45,46,47,48,49,51,52,53,54,55,56,58,59,60,61,65,66,68,69,70,71,73,74,75,78,79,80,83,84,85,86,87,88,89,90,91,93,94,95,97,98,99,100,102,103,104,105,106,108,109,110,112,115,118,119,120,121,122,123,124,129,130,131,132,134,135,137,142,143,144,145,146,147,148,149,150,151,152,153,154,157,159,162,164,165,166,171,172,173,174,175,176,178,179,180,181,183,186,187,189,190,194,196,201,203,208,209,210,211,214,215,216,218,219,225,226,227,229,230,233,237,239,10000,10001,10004,10010,10011,10013,10014,10019,10020,10022,10024,10025,10026,10028,10032,10033,10039,10040,10042,10044,10045,10047,10049,10050,10052,10054,10059,10060,10061,10063,10064,10065,10066,10067,10068,10070,10071,10072,10073,10074,10075,10076,10080,10083,10085,10092,10094,10096,10097,10100,10101,10107,10108,10120,10121,10122,10123,10126,10127,10130,10132,10133,10134,10135,10136,10142,10143,10144,10145,10147,10150,10151,10153,10157,10158,10159,10160,10161,10163,10164,10165,10167,10168,10169,10170,10171,10173,10174,10175,10176,10179,10180,10181,10182,10184,10186,10187,10190,10191,10200,10201,10202,10203,10205,10211,10214,10215,10216,10218,10219,10223,10224,10225,10226,10227,10228,10229,10230,10232,10234,10235,10236,10237,10238,10241,10242,10244,10245,10246,10249,10250,10251,10252,10253,10255,10258,10260,10265,10267,10272,10277,10278,10279,10280,10284,10286,10287,10288,10289,10292,10294,10298,10299,10300,10301,10302,10303,10304,10306,10307,10308,10309,10311,10312,10314,10315,10316,10322,10323,10324,10325,10326,10327,10329,10330,10336,10337,10342,10343,10344,10346,10347,10348,10349,10351,10352,10353,10354,10355,10356,10358,10359,10360,10362,10363,10364,10368,10370,10372,10373,10374,10375,10376,10377,10379,10382,10385,10386,10387,10391,10393,10395,10397,10398,10399,10402,10403,10405,10407,10408,10410,10411,10412,10413,10414,10415,10416,10417,10418,10419,10420,10421,10422,10424,10425,10426,10427,10428,10430,10435,10436,10441,10442,10445,10447,10448,10449,10450,10451,10452,10453,10454,10455,10456,10457,10458,10460,10461,10462,10463,10464,10465,10466,10467,10468,10469,10470,10471,10472,10476,10482,10484,10485,10488,10489,10490,10491,10492,10493,10496,10498,10501,10503,10504,10505,10506,10507,10508,10509,10512,10513,10514,10515,10516,10517,10518,10519,10520,10521,10522,10523,10524,10525,10527,10529,10533,10534,10535,10536,10549,10550,10551,10552,10553,10554,10556,10557,10558,10559,10562,10564,10565,10567,10571,10572,10573,10575,10576,10577,10579,10580,10582,10583,10584,10585,10586,10587,10588,10589,10590,10592,10595,10596,10597,10598,10599,10600,10601,10602,10603,10604,10606,10607,10608,10609,10611,10612,10613,10614,10615,10616,10617,10618,10619,10620,10622,10623,10624,10625,10626,10627,10630,10631,10632,10636,10637,10638,10641,10642,10643,10644,10645,10647,10648,10649,10650,10651,10652,10653,10654,10655,10656,10658,10659,10660,10667,10668,10669,10670,10671,10672,10673,10675,10676,10677,10678,10679,10680,10681,10682,10683,10684,10685,10686,10688,10691,10695,10696,10697,10698,10699,10700,10701,10702,10703,10704,10705,10706,10707,10710,10714,10715,10717,10718,10724,10725,10726,10727,10729,10730,10732,10733,10734,10735,10736,10737,10738,10739,10740,10744,10745,10746,10747,10748,10751,10752,10754,10756,10757,10758,10761,10762,10764,10765,10766,10767,10768,10770,10771,10772,10773,10774,10776,10777,10779,10780,10781,10785,10786,10787,10788,10789,10790,10792,10793,10794,10795,10796,10798,10799,10800,10801,10802,10803,10804,10805,10806,10807,10808,10809,10810,10812,10813,10814,10816,10818,10819,10820,10821,10822,10823,10825,10826,10827,10829,10830,10831,10832,10833,10834,10835,10836,10837,10838,10839,10840,10841,10842,10843,10844,10848,10851,10855,10857,10858,10859,10860,10861,10864,10865,10867,10868,10869,10870,10871,10872,10873,10876,10877,10878,10880,10881,10882,10883,10884,10885,10886,10887,10888,10890,10892"

INDIA_3_CITIES = "64,96,107,111,113,128,133,155,156,158,160,161,163,168,169,170,184,185,188,192,193,195,197,198,199,200,202,204,205,206,207,212,213,217,220,221,222,223,228,231,234,235,236,238,10002,10003,10006,10007,10008,10009,10012,10016,10018,10021,10023,10027,10030,10031,10034,10037,10038,10041,10043,10046,10048,10051,10055,10056,10057,10058,10069,10077,10078,10079,10081,10082,10084,10086,10088,10089,10090,10091,10093,10095,10098,10099,10102,10103,10104,10105,10106,10124,10125,10128,10129,10131,10137,10138,10140,10141,10146,10149,10152,10154,10155,10156,10162,10166,10172,10183,10185,10188,10192,10193,10194,10195,10196,10197,10198,10199,10204,10206,10207,10208,10209,10210,10213,10217,10221,10222,10231,10233,10239,10240,10243,10247,10248,10254,10256,10257,10259,10262,10263,10264,10266,10268,10269,10270,10271,10273,10274,10275,10276,10281,10282,10283,10285,10290,10291,10293,10295,10296,10305,10310,10313,10317,10318,10319,10320,10321,10328,10335,10350,10357,10361,10365,10366,10367,10369,10378,10380,10384,10396,10400,10401,10404,10406,10423,10429,10432,10433,10434,10438,10439,10440,10443,10444,10473,10474,10479,10480,10481,10483,10486,10487,10494,10495,10497,10499,10500,10502,10511,10528,10530,10531,10538,10539,10548,10560,10561,10563,10566,10568,10569,10570,10574,10578,10591,10593,10594,10605,10610,10621,10629,10639,10640,10661,10662,10664,10665,10666,10687,10689,10690,10692,10693,10709,10711,10712,10713,10716,10731,10753,10763,10769,10775,10778,10783,10811,10815,10824,10828"

INDIA_NEXT_CITIES = INDIA_2_CITIES + "," + INDIA_3_CITIES

INDIA_1_CITIES = "1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,18,19,20,24,38,39,44,50,57,63,77,81,117,138,139,10459"

# All cluster city filters use city_code IN lists — no join needed
CLUSTER_CITY_FILTER: dict[str, str] = {
    "india_next": f"AND a.city_code IN ({INDIA_NEXT_CITIES})",
    "india_2":    f"AND a.city_code IN ({INDIA_2_CITIES})",
    "india_3":    f"AND a.city_code IN ({INDIA_3_CITIES})",
    "india_1":    f"AND a.city_code IN ({INDIA_1_CITIES})",
}
CLUSTER_CITY_FILTER_STATE: dict[str, str] = CLUSTER_CITY_FILTER

# Traffic table has `classification` column: India_1 / India_2 / India_rise (=India3)
CLUSTER_TRAFFIC_FILTER: dict[str, str] = {
    "india_next": "AND t.classification IN ('India_2','India_rise')",
    "india_2":    "AND t.classification = 'India_2'",
    "india_3":    "AND t.classification = 'India_rise'",
    "india_1":    "AND t.classification = 'India_1'",
}
CLUSTER_TRAFFIC_FILTER_STATE: dict[str, str] = CLUSTER_TRAFFIC_FILTER

CLUSTER_CITY_LIST: dict[str, str] = {
    "india_next": INDIA_NEXT_CITIES,
    "india_2":    INDIA_2_CITIES,
    "india_3":    INDIA_3_CITIES,
    "india_1":    INDIA_1_CITIES,
}

def _city_filter(cluster: str) -> tuple[str, str, str]:
    """Return (orders_city_filter, traffic_city_filter, city_list) for the given cluster slug."""
    c = cluster.lower().replace(" ", "_").replace("+", "_")
    orders_f  = CLUSTER_CITY_FILTER.get(c,  CLUSTER_CITY_FILTER["india_next"])
    traffic_f = CLUSTER_TRAFFIC_FILTER.get(c, CLUSTER_TRAFFIC_FILTER["india_next"])
    city_list = CLUSTER_CITY_LIST.get(c, CLUSTER_CITY_LIST["india_next"])
    return orders_f, traffic_f, city_list

def build_query(cluster: str = "india_next"):
    str_values = ",".join(f"('{c}')" for c in STR_COUPONS)
    orders_f, traffic_f, city_val = _city_filter(cluster)
    return f"""
WITH
ec_offer_crud AS (
  SELECT DISTINCT offer_id, template_id
  FROM prod.streams_delta.offer_crud_event
  WHERE dt >= current_date - 90 AND template_id IN ({EC_TEMPLATES})
),
str_coupons AS (
  SELECT coupon_code FROM (VALUES {str_values}) t(coupon_code)
),
max_time AS (
  SELECT DATE_FORMAT(MAX(created_on), 'HH:mm:ss') AS max_hms
  FROM prod.transformer.uoms_swiggy_orders
  WHERE dt = current_date() AND toing_order_flag = 0 AND city_code IN ({city_val})
),
base AS (
  SELECT HOUR(a.created_on) AS hr, a.dt, a.order_id, a.offer_details,
    a.coupon_code, a.OfferID_and_total_offer_discount,
    a.swiggy_discount, a.alliance_discount, a.swiggy_discount_hit,
    a.restaurantdiscounthit, a.restaurantoffersdiscount,
    a.cart_discount, a.swgdiscount, a.banner_factor, a.order_restaurant_bill
  FROM prod.transformer.uoms_swiggy_orders a CROSS JOIN max_time m
  WHERE a.dt IN (current_date(), current_date() - 7) AND a.toing_order_flag = 0
    {orders_f}
    AND (a.dt = current_date() OR (a.dt = current_date() - 7 AND DATE_FORMAT(a.created_on,'HH:mm:ss') <= m.max_hms))
  GROUP BY ALL
),
exploded AS (
  SELECT hr, dt, order_id, f.value AS offer_detail
  FROM base LATERAL VIEW explode(offer_details) f AS value
),
ec_order_level AS (
  SELECT e.hr, e.dt, e.order_id, SUM(e.offer_detail['swiggy_discount']) AS ec_sdpo
  FROM exploded e INNER JOIN ec_offer_crud oc ON oc.offer_id = e.offer_detail['offer_id']
  GROUP BY e.hr, e.dt, e.order_id
),
str_order_level AS (
  SELECT b.hr, b.dt, b.order_id,
    CASE WHEN b.coupon_code IN (SELECT coupon_code FROM str_coupons)
         THEN b.OfferID_and_total_offer_discount[0]['total_offer_discount'] END AS str_burn
  FROM base b
),
hourly AS (
  SELECT b.hr, b.dt,
    COUNT(DISTINCT b.order_id) AS total_opd,
    ROUND(COUNT(DISTINCT CASE WHEN b.banner_factor>1.6 THEN b.order_id END)/NULLIF(COUNT(DISTINCT b.order_id),0)*100,1) AS ob_pct,
    ROUND(SUM(COALESCE(b.order_restaurant_bill,0))/NULLIF(COUNT(DISTINCT b.order_id),0),0) AS amv,
    ROUND(SUM(COALESCE(b.cart_discount,0)+COALESCE(b.restaurantdiscounthit,0)+COALESCE(b.swiggy_discount_hit,0))/NULLIF(COUNT(DISTINCT b.order_id),0),2) AS cdpo_po,
    ROUND(SUM(COALESCE(b.swiggy_discount,0)+COALESCE(b.swiggy_discount_hit,0)+COALESCE(b.alliance_discount,0))/NULLIF(COUNT(DISTINCT b.order_id),0),2) AS sdpo_po,
    ROUND(SUM(COALESCE(b.restaurantdiscounthit,0)+COALESCE(b.restaurantoffersdiscount,0))/NULLIF(COUNT(DISTINCT b.order_id),0),2) AS rdpo_po,
    ROUND(SUM(COALESCE(b.swgdiscount,0))/NULLIF(COUNT(DISTINCT b.order_id),0),2) AS swgd_po,
    ROUND(SUM(COALESCE(ec.ec_sdpo,0))/NULLIF(COUNT(DISTINCT b.order_id),0),2) AS ec_sdpo_po,
    ROUND(SUM(COALESCE(CAST(st.str_burn AS DOUBLE),0))/NULLIF(COUNT(DISTINCT b.order_id),0),2) AS str_po
  FROM base b
  LEFT JOIN ec_order_level ec ON ec.order_id=b.order_id AND ec.hr=b.hr AND ec.dt=b.dt
  LEFT JOIN str_order_level st ON st.order_id=b.order_id AND st.hr=b.hr AND st.dt=b.dt
  GROUP BY b.hr, b.dt
),
traffic AS (
  SELECT hour(t.hr) AS hr,
    SUM(t.pl_sessions) AS sessions, SUM(t.sdlw_pl_sessions) AS lw_sessions,
    SUM(t.conv_p1_sessions) AS conv_sessions, SUM(t.sdlw_conv_p1_sessions) AS lw_conv_sessions
  FROM prod.analytics_prod.kg_real_time_food_traffic_orders_final_time_bucket t
  WHERE t.dt = current_date() AND t.platform IN ('Android','iOS') {traffic_f}
  GROUP BY hour(t.hr)
),
final AS (
  SELECT CAST(tw.hr AS STRING) AS hr,
    tw.total_opd, lw.total_opd AS lw_opd,
    ROUND((tw.total_opd-lw.total_opd)/NULLIF(lw.total_opd,0)*100,1) AS opd_gr,
    t.sessions, t.lw_sessions,
    ROUND((t.sessions-t.lw_sessions)/NULLIF(t.lw_sessions,0)*100,1) AS traffic_gr,
    ROUND(t.conv_sessions/NULLIF(t.sessions,0)*100,2) AS cvr,
    ROUND(t.lw_conv_sessions/NULLIF(t.lw_sessions,0)*100,2) AS lw_cvr,
    ROUND((t.conv_sessions/NULLIF(t.sessions,0)-t.lw_conv_sessions/NULLIF(t.lw_sessions,0))*100,2) AS cvr_chg,
    tw.ob_pct, lw.ob_pct AS lw_ob_pct, ROUND(tw.ob_pct-lw.ob_pct,1) AS ob_chg,
    tw.amv, lw.amv AS lw_amv, ROUND((tw.amv-lw.amv)/NULLIF(lw.amv,0)*100,1) AS amv_gr,
    tw.cdpo_po, lw.cdpo_po AS lw_cdpo, ROUND(tw.cdpo_po-lw.cdpo_po,2) AS cdpo_chg,
    tw.sdpo_po, lw.sdpo_po AS lw_sdpo, ROUND(tw.sdpo_po-lw.sdpo_po,2) AS sdpo_chg,
    tw.rdpo_po, lw.rdpo_po AS lw_rdpo, ROUND(tw.rdpo_po-lw.rdpo_po,2) AS rdpo_chg,
    tw.ec_sdpo_po, lw.ec_sdpo_po AS lw_ec, ROUND(tw.ec_sdpo_po-lw.ec_sdpo_po,2) AS ec_chg,
    tw.str_po, lw.str_po AS lw_str, ROUND(tw.str_po-lw.str_po,2) AS str_chg,
    ROUND(tw.swgd_po-tw.str_po,2) AS bc, ROUND(lw.swgd_po-lw.str_po,2) AS lw_bc,
    ROUND((tw.swgd_po-tw.str_po)-(lw.swgd_po-lw.str_po),2) AS bc_chg
  FROM hourly tw
  LEFT JOIN hourly lw ON lw.hr=tw.hr AND lw.dt=current_date()-7
  LEFT JOIN traffic t ON t.hr=tw.hr
  WHERE tw.dt=current_date()
)
SELECT * FROM final
UNION ALL
SELECT 'Overall',
  SUM(total_opd), SUM(lw_opd), ROUND((SUM(total_opd)-SUM(lw_opd))/NULLIF(SUM(lw_opd),0)*100,1),
  SUM(sessions), SUM(lw_sessions), ROUND((SUM(sessions)-SUM(lw_sessions))/NULLIF(SUM(lw_sessions),0)*100,1),
  ROUND(SUM(conv_sessions)/NULLIF(SUM(sessions),0)*100,2), ROUND(SUM(lw_conv_sessions)/NULLIF(SUM(lw_sessions),0)*100,2),
  ROUND((SUM(conv_sessions)/NULLIF(SUM(sessions),0)-SUM(lw_conv_sessions)/NULLIF(SUM(lw_sessions),0))*100,2),
  ROUND(SUM(ob_pct*total_opd)/NULLIF(SUM(total_opd),0),1), ROUND(SUM(lw_ob_pct*lw_opd)/NULLIF(SUM(lw_opd),0),1), ROUND(SUM(ob_pct*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_ob_pct*lw_opd)/NULLIF(SUM(lw_opd),0),1),
  ROUND(SUM(amv*total_opd)/NULLIF(SUM(total_opd),0),0), ROUND(SUM(lw_amv*lw_opd)/NULLIF(SUM(lw_opd),0),0), ROUND((SUM(amv*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_amv*lw_opd)/NULLIF(SUM(lw_opd),0))/NULLIF(SUM(lw_amv*lw_opd)/NULLIF(SUM(lw_opd),0),0)*100,1),
  ROUND(SUM(cdpo_po*total_opd)/NULLIF(SUM(total_opd),0),2), ROUND(SUM(lw_cdpo*lw_opd)/NULLIF(SUM(lw_opd),0),2), ROUND(SUM(cdpo_po*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_cdpo*lw_opd)/NULLIF(SUM(lw_opd),0),2),
  ROUND(SUM(sdpo_po*total_opd)/NULLIF(SUM(total_opd),0),2), ROUND(SUM(lw_sdpo*lw_opd)/NULLIF(SUM(lw_opd),0),2), ROUND(SUM(sdpo_po*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_sdpo*lw_opd)/NULLIF(SUM(lw_opd),0),2),
  ROUND(SUM(rdpo_po*total_opd)/NULLIF(SUM(total_opd),0),2), ROUND(SUM(lw_rdpo*lw_opd)/NULLIF(SUM(lw_opd),0),2), ROUND(SUM(rdpo_po*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_rdpo*lw_opd)/NULLIF(SUM(lw_opd),0),2),
  ROUND(SUM(ec_sdpo_po*total_opd)/NULLIF(SUM(total_opd),0),2), ROUND(SUM(lw_ec*lw_opd)/NULLIF(SUM(lw_opd),0),2), ROUND(SUM(ec_sdpo_po*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_ec*lw_opd)/NULLIF(SUM(lw_opd),0),2),
  ROUND(SUM(str_po*total_opd)/NULLIF(SUM(total_opd),0),2), ROUND(SUM(lw_str*lw_opd)/NULLIF(SUM(lw_opd),0),2), ROUND(SUM(str_po*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_str*lw_opd)/NULLIF(SUM(lw_opd),0),2),
  ROUND(SUM(bc*total_opd)/NULLIF(SUM(total_opd),0),2), ROUND(SUM(lw_bc*lw_opd)/NULLIF(SUM(lw_opd),0),2), ROUND(SUM(bc*total_opd)/NULLIF(SUM(total_opd),0)-SUM(lw_bc*lw_opd)/NULLIF(SUM(lw_opd),0),2)
FROM (SELECT f.*, t2.conv_sessions, t2.lw_conv_sessions FROM final f LEFT JOIN traffic t2 ON t2.hr = CAST(f.hr AS INT)) x
ORDER BY CASE WHEN hr='Overall' THEN 999 ELSE CAST(hr AS INT) END
"""

def build_city_query(cluster: str = "india_next"):
    str_values = ",".join(f"('{c}')" for c in STR_COUPONS)
    orders_f, traffic_f, city_val = _city_filter(cluster)
    return f"""
WITH
ec_offer_crud AS (
  SELECT DISTINCT offer_id, template_id
  FROM prod.streams_delta.offer_crud_event
  WHERE dt >= current_date - 90 AND template_id IN ({EC_TEMPLATES})
),
str_coupons AS (
  SELECT coupon_code FROM (VALUES {str_values}) t(coupon_code)
),
max_time AS (
  SELECT DATE_FORMAT(MAX(created_on), 'HH:mm:ss') AS max_hms
  FROM prod.transformer.uoms_swiggy_orders
  WHERE dt = current_date() AND toing_order_flag = 0 AND city_code IN ({city_val})
),
base AS (
  SELECT HOUR(a.created_on) AS hr, a.dt, a.order_id,
    cv.city_name AS city,
    a.coupon_code, a.OfferID_and_total_offer_discount, a.offer_details,
    a.swiggy_discount, a.alliance_discount, a.swiggy_discount_hit,
    a.restaurantdiscounthit, a.restaurantoffersdiscount,
    a.cart_discount, a.swgdiscount
  FROM prod.transformer.uoms_swiggy_orders a
  INNER JOIN prod.analytics_prod.all_cities_view_v4 cv ON a.city_code = cv.city_id
  CROSS JOIN max_time m
  WHERE a.dt IN (current_date(), current_date() - 7)
    AND a.toing_order_flag = 0
    {orders_f}
    AND (a.dt = current_date() OR (a.dt = current_date() - 7 AND DATE_FORMAT(a.created_on,'HH:mm:ss') <= m.max_hms))
),
exploded AS (
  SELECT hr, dt, order_id, f.value AS offer_detail
  FROM base LATERAL VIEW explode(offer_details) f AS value
),
ec_order_level AS (
  SELECT e.hr, e.dt, e.order_id, SUM(e.offer_detail['swiggy_discount']) AS ec_sdpo
  FROM exploded e INNER JOIN ec_offer_crud oc ON oc.offer_id = e.offer_detail['offer_id']
  GROUP BY e.hr, e.dt, e.order_id
),
str_order_level AS (
  SELECT b.hr, b.dt, b.order_id,
    CASE WHEN b.coupon_code IN (SELECT coupon_code FROM str_coupons)
         THEN b.OfferID_and_total_offer_discount[0]['total_offer_discount'] END AS str_burn
  FROM base b
),
traffic_city AS (
  SELECT lower(t.city) AS city_key,
    hour(t.hr) AS hr,
    SUM(t.pl_sessions)              AS sessions,
    SUM(t.sdlw_pl_sessions)         AS lw_sessions,
    SUM(t.conv_p1_sessions)         AS conv_sessions,
    SUM(t.sdlw_conv_p1_sessions)    AS lw_conv_sessions
  FROM prod.analytics_prod.kg_real_time_food_traffic_orders_final_time_bucket t
  WHERE t.dt = current_date() AND t.platform IN ('Android','iOS')
    {traffic_f}
  GROUP BY lower(t.city), hour(t.hr)
)
SELECT b.city, b.hr, b.dt,
  COUNT(DISTINCT b.order_id)                                                                      AS orders,
  COUNT(DISTINCT CASE WHEN b.coupon_code IS NOT NULL AND b.coupon_code != '' THEN b.order_id END) AS coupon_orders,
  SUM(COALESCE(b.cart_discount,0)+COALESCE(b.restaurantdiscounthit,0)+COALESCE(b.swiggy_discount_hit,0)) AS cdpo_sum,
  SUM(COALESCE(b.swiggy_discount,0)+COALESCE(b.swiggy_discount_hit,0)+COALESCE(b.alliance_discount,0))  AS sdpo_sum,
  SUM(COALESCE(b.restaurantdiscounthit,0)+COALESCE(b.restaurantoffersdiscount,0))                       AS rdpo_sum,
  SUM(COALESCE(b.swgdiscount,0))                                                                        AS swgd_sum,
  SUM(COALESCE(b.swiggy_discount_hit,0))                                                                AS camp_sum,
  SUM(COALESCE(ec.ec_sdpo,0))                                                                           AS ec_sum,
  SUM(COALESCE(CAST(st.str_burn AS DOUBLE),0))                                                          AS str_sum,
  MAX(COALESCE(tr.sessions,0))        AS sessions,
  MAX(COALESCE(tr.lw_sessions,0))     AS lw_sessions,
  MAX(COALESCE(tr.conv_sessions,0))   AS conv_sessions,
  MAX(COALESCE(tr.lw_conv_sessions,0)) AS lw_conv_sessions
FROM base b
LEFT JOIN ec_order_level ec ON ec.order_id=b.order_id AND ec.hr=b.hr AND ec.dt=b.dt
LEFT JOIN str_order_level st ON st.order_id=b.order_id AND st.hr=b.hr AND st.dt=b.dt
LEFT JOIN traffic_city tr ON tr.city_key=lower(b.city) AND tr.hr=b.hr AND b.dt=current_date()
GROUP BY b.city, b.hr, b.dt
ORDER BY b.dt, b.city, b.hr
"""

def build_state_query(cluster: str = "india_next"):
    str_values = ",".join(f"('{c}')" for c in STR_COUPONS)
    orders_f, traffic_f, city_val = _city_filter(cluster)
    return f"""
WITH
ec_offer_crud AS (
  SELECT DISTINCT offer_id, template_id
  FROM prod.streams_delta.offer_crud_event
  WHERE dt >= current_date - 90 AND template_id IN ({EC_TEMPLATES})
),
str_coupons AS (
  SELECT coupon_code FROM (VALUES {str_values}) t(coupon_code)
),
max_time AS (
  SELECT DATE_FORMAT(MAX(created_on), 'HH:mm:ss') AS max_hms
  FROM prod.transformer.uoms_swiggy_orders
  WHERE dt = current_date() AND toing_order_flag = 0 AND city_code IN ({city_val})
),
base AS (
  SELECT HOUR(a.created_on) AS hr, a.dt, a.order_id,
    cv.state AS state,
    a.coupon_code, a.OfferID_and_total_offer_discount, a.offer_details,
    a.swiggy_discount, a.alliance_discount, a.swiggy_discount_hit,
    a.restaurantdiscounthit, a.restaurantoffersdiscount,
    a.cart_discount, a.swgdiscount
  FROM prod.transformer.uoms_swiggy_orders a
  INNER JOIN prod.analytics_prod.all_cities_view_v4 cv ON a.city_code = cv.city_id
  CROSS JOIN max_time m
  WHERE a.dt IN (current_date(), current_date() - 7)
    AND a.toing_order_flag = 0
    {orders_f}
    AND (a.dt = current_date() OR (a.dt = current_date() - 7 AND DATE_FORMAT(a.created_on,'HH:mm:ss') <= m.max_hms))
),
exploded AS (
  SELECT hr, dt, order_id, f.value AS offer_detail
  FROM base LATERAL VIEW explode(offer_details) f AS value
),
ec_order_level AS (
  SELECT e.hr, e.dt, e.order_id, SUM(e.offer_detail['swiggy_discount']) AS ec_sdpo
  FROM exploded e INNER JOIN ec_offer_crud oc ON oc.offer_id = e.offer_detail['offer_id']
  GROUP BY e.hr, e.dt, e.order_id
),
str_order_level AS (
  SELECT b.hr, b.dt, b.order_id,
    CASE WHEN b.coupon_code IN (SELECT coupon_code FROM str_coupons)
         THEN b.OfferID_and_total_offer_discount[0]['total_offer_discount'] END AS str_burn
  FROM base b
),
traffic_state AS (
  SELECT cv.state,
    hour(t.hr) AS hr,
    SUM(t.pl_sessions)              AS sessions,
    SUM(t.sdlw_pl_sessions)         AS lw_sessions,
    SUM(t.conv_p1_sessions)         AS conv_sessions,
    SUM(t.sdlw_conv_p1_sessions)    AS lw_conv_sessions
  FROM prod.analytics_prod.kg_real_time_food_traffic_orders_final_time_bucket t
  INNER JOIN prod.analytics_prod.all_cities_view_v4 cv ON lower(t.city) = lower(cv.city_name)
  WHERE t.dt = current_date() AND t.platform IN ('Android','iOS')
    {traffic_f}
  GROUP BY cv.state, hour(t.hr)
)
SELECT b.state, b.hr, b.dt,
  COUNT(DISTINCT b.order_id)                                                                      AS orders,
  COUNT(DISTINCT CASE WHEN b.coupon_code IS NOT NULL AND b.coupon_code != '' THEN b.order_id END) AS coupon_orders,
  SUM(COALESCE(b.cart_discount,0)+COALESCE(b.restaurantdiscounthit,0)+COALESCE(b.swiggy_discount_hit,0)) AS cdpo_sum,
  SUM(COALESCE(b.swiggy_discount,0)+COALESCE(b.swiggy_discount_hit,0)+COALESCE(b.alliance_discount,0))  AS sdpo_sum,
  SUM(COALESCE(b.restaurantdiscounthit,0)+COALESCE(b.restaurantoffersdiscount,0))                       AS rdpo_sum,
  SUM(COALESCE(b.swgdiscount,0))                                                                        AS swgd_sum,
  SUM(COALESCE(b.swiggy_discount_hit,0))                                                                AS camp_sum,
  SUM(COALESCE(ec.ec_sdpo,0))                                                                           AS ec_sum,
  SUM(COALESCE(CAST(st.str_burn AS DOUBLE),0))                                                          AS str_sum,
  MAX(COALESCE(tr.sessions,0))        AS sessions,
  MAX(COALESCE(tr.lw_sessions,0))     AS lw_sessions,
  MAX(COALESCE(tr.conv_sessions,0))   AS conv_sessions,
  MAX(COALESCE(tr.lw_conv_sessions,0)) AS lw_conv_sessions
FROM base b
LEFT JOIN ec_order_level ec ON ec.order_id=b.order_id AND ec.hr=b.hr AND ec.dt=b.dt
LEFT JOIN str_order_level st ON st.order_id=b.order_id AND st.hr=b.hr AND st.dt=b.dt
LEFT JOIN traffic_state tr ON lower(tr.state)=lower(b.state) AND tr.hr=b.hr AND b.dt=current_date()
GROUP BY b.state, b.hr, b.dt
ORDER BY b.dt, b.state, b.hr
"""

TERMINAL_STATES = {StatementState.SUCCEEDED, StatementState.FAILED, StatementState.CANCELED, StatementState.CLOSED}

def run_query(sql: str) -> list[dict]:
    import time
    w = get_client()

    # wait_timeout=0s → returns immediately with statement_id, no long HTTP block
    resp = w.statement_execution.execute_statement(
        warehouse_id=DBR_WAREHOUSE_ID,
        statement=sql.strip(),
        wait_timeout="0s",
        disposition=Disposition.INLINE,
        format=Format.JSON_ARRAY,
    )

    # Poll until terminal state, max 10 minutes
    for _ in range(120):
        if resp.status and resp.status.state in TERMINAL_STATES:
            break
        time.sleep(5)
        resp = w.statement_execution.get_statement(resp.statement_id)
        print(f"[query] state={resp.status.state}", flush=True)

    if resp.status and resp.status.state != StatementState.SUCCEEDED:
        err = (resp.status.error.message if resp.status and resp.status.error else None) or str(resp.status.state)
        raise RuntimeError(f"Query failed: {err}")

    cols = [c.name for c in resp.manifest.schema.columns] if resp.manifest and resp.manifest.schema else []
    data = resp.result.data_array if resp.result and resp.result.data_array else []

    rows = []
    for row_vals in data:
        row: dict[str, Any] = {}
        for i, col in enumerate(cols):
            raw = row_vals[i] if i < len(row_vals) else None
            if raw in (None, ""):
                row[col] = None
            else:
                try:
                    row[col] = float(raw)
                except (ValueError, TypeError):
                    row[col] = raw
        rows.append(row)
    return rows


# ── Background cache ───────────────────────────────────────────────────────────
REFRESH_INTERVAL = 10 * 60  # seconds — refresh every 10 minutes

_cache: dict[str, dict] = {}          # cluster -> last successful payload
_state_cache: dict[str, dict] = {}    # cluster -> last successful state payload
_city_cache: dict[str, dict] = {}     # cluster -> last successful city payload
_refreshing: set[str] = set()         # clusters currently being fetched

CLUSTERS = ["india_next", "india_2", "india_3", "india_1"]


def _build_data_payload(cluster: str) -> dict:
    rows     = run_query(build_query(cluster))
    overall  = next((r for r in rows if r.get("hr") == "Overall"), None)
    hourly   = [r for r in rows if r.get("hr") != "Overall"]
    latest_h = max((int(r["hr"]) for r in hourly if r.get("hr") is not None), default=0)
    return {
        "generated_at": datetime.now().strftime("%d %b %Y %H:%M IST"),
        "latest_hr":    latest_h,
        "overall":      overall,
        "hourly":       sorted(hourly, key=lambda r: int(r["hr"])),
    }


def _build_state_payload(cluster: str) -> dict:
    from datetime import date, timedelta
    rows = run_query(build_state_query(cluster))

    today_str = str(date.today())
    lw_str    = str(date.today() - timedelta(days=7))

    for r in rows:
        if r.get("dt") is not None:
            r["dt"] = str(r["dt"])[:10]

    tw_data = _agg(rows, today_str)
    lw_data = _agg(rows, lw_str)

    all_states = sorted(
        set(tw_data.keys()) | set(lw_data.keys()),
        key=lambda s: -(tw_data.get(s, {}).get(-1, {}).get("orders", 0) +
                        sum(v.get("orders", 0) for v in tw_data.get(s, {}).values()))
    )
    all_hours = sorted(set(
        hr for state_hrs in list(tw_data.values()) + list(lw_data.values())
        for hr in state_hrs.keys()
        if hr >= 0
    ))

    def collapse(state_hrs: dict) -> dict:
        total: dict = dict(_ZERO_STATE)
        for hr_data in state_hrs.values():
            for k in total:
                total[k] += hr_data.get(k, 0.0)
        return total

    summary = []
    for state in all_states:
        tw = _derive(collapse(tw_data.get(state, {})))
        lw = _derive(collapse(lw_data.get(state, {})))
        lw["sessions"] = tw.pop("lw_sessions", 0)
        lw["cvr"]      = tw.pop("lw_cvr", None)
        tw.pop("lw_sessions", None)
        tw.pop("lw_cvr", None)
        row: dict[str, Any] = {"state": state}
        for k, v in tw.items():
            row[f"tw_{k}"] = v
        for k, v in lw.items():
            row[f"lw_{k}"] = v
        for k in tw:
            tv, lv = tw[k], lw[k]
            if tv is None or lv is None:
                row[f"d_{k}"] = None
            elif k in ("orders", "sessions"):
                row[f"d_{k}"] = round((tv - lv) / lv * 100, 1) if lv else None
            elif k == "cvr":
                row[f"d_{k}"] = round(tv - lv, 2) if lv is not None else None
            else:
                row[f"d_{k}"] = round(tv - lv, 2)
        summary.append(row)

    hourly: dict[str, list] = {}
    for state in all_states:
        hrs = []
        for hr in all_hours:
            tw_hr = _derive(tw_data.get(state, {}).get(hr, dict(_ZERO_STATE)))
            lw_hr = _derive(lw_data.get(state, {}).get(hr, dict(_ZERO_STATE)))
            lw_hr["sessions"] = tw_hr.pop("lw_sessions", 0)
            lw_hr["cvr"]      = tw_hr.pop("lw_cvr", None)
            tw_hr.pop("lw_sessions", None)
            tw_hr.pop("lw_cvr", None)
            hrs.append({"hr": hr, "tw": tw_hr, "lw": lw_hr})
        hourly[state] = hrs

    return {
        "generated_at": datetime.now().strftime("%d %b %Y %H:%M IST"),
        "states":  all_states,
        "hours":   all_hours,
        "summary": summary,
        "hourly":  hourly,
    }


def _build_city_payload(cluster: str) -> dict:
    from datetime import date, timedelta
    rows = run_query(build_city_query(cluster))

    today_str = str(date.today())
    lw_str    = str(date.today() - timedelta(days=7))

    for r in rows:
        if r.get("dt") is not None:
            r["dt"] = str(r["dt"])[:10]

    def agg_city(dt_filter):
        from collections import defaultdict
        data: dict = defaultdict(lambda: defaultdict(lambda: dict(_ZERO_STATE)))
        for r in rows:
            if r.get("dt") != dt_filter:
                continue
            city = r.get("city") or "Unknown"
            hr   = int(r["hr"]) if r.get("hr") is not None else -1
            d    = data[city][hr]
            for k in _ZERO_STATE:
                d[k] += r.get(k) or 0.0
        return data

    tw_data = agg_city(today_str)
    lw_data = agg_city(lw_str)

    all_cities = sorted(
        set(tw_data.keys()) | set(lw_data.keys()),
        key=lambda c: -(tw_data.get(c, {}).get(-1, {}).get("orders", 0) +
                        sum(v.get("orders", 0) for v in tw_data.get(c, {}).values()))
    )
    all_hours = sorted(set(
        hr for city_hrs in list(tw_data.values()) + list(lw_data.values())
        for hr in city_hrs.keys()
        if hr >= 0
    ))

    def collapse(city_hrs: dict) -> dict:
        total: dict = dict(_ZERO_STATE)
        for hr_data in city_hrs.values():
            for k in total:
                total[k] += hr_data.get(k, 0.0)
        return total

    summary = []
    for city in all_cities:
        tw = _derive(collapse(tw_data.get(city, {})))
        lw = _derive(collapse(lw_data.get(city, {})))
        lw["sessions"] = tw.pop("lw_sessions", 0)
        lw["cvr"]      = tw.pop("lw_cvr", None)
        tw.pop("lw_sessions", None)
        tw.pop("lw_cvr", None)
        row: dict[str, Any] = {"city": city}
        for k, v in tw.items():
            row[f"tw_{k}"] = v
        for k, v in lw.items():
            row[f"lw_{k}"] = v
        for k in tw:
            tv, lv = tw[k], lw[k]
            if tv is None or lv is None:
                row[f"d_{k}"] = None
            elif k in ("orders", "sessions"):
                row[f"d_{k}"] = round((tv - lv) / lv * 100, 1) if lv else None
            elif k == "cvr":
                row[f"d_{k}"] = round(tv - lv, 2) if lv is not None else None
            else:
                row[f"d_{k}"] = round(tv - lv, 2)
        summary.append(row)

    hourly: dict[str, list] = {}
    for city in all_cities:
        hrs = []
        for hr in all_hours:
            tw_hr = _derive(tw_data.get(city, {}).get(hr, dict(_ZERO_STATE)))
            lw_hr = _derive(lw_data.get(city, {}).get(hr, dict(_ZERO_STATE)))
            lw_hr["sessions"] = tw_hr.pop("lw_sessions", 0)
            lw_hr["cvr"]      = tw_hr.pop("lw_cvr", None)
            tw_hr.pop("lw_sessions", None)
            tw_hr.pop("lw_cvr", None)
            hrs.append({"hr": hr, "tw": tw_hr, "lw": lw_hr})
        hourly[city] = hrs

    return {
        "generated_at": datetime.now().strftime("%d %b %Y %H:%M IST"),
        "cities":  all_cities,
        "hours":   all_hours,
        "summary": summary,
        "hourly":  hourly,
    }


async def _refresh_cluster(cluster: str):
    if cluster in _refreshing:
        return
    _refreshing.add(cluster)
    loop = asyncio.get_event_loop()
    try:
        print(f"[cache] refreshing dashboard data for {cluster}", flush=True)
        payload = await loop.run_in_executor(None, _build_data_payload, cluster)
        _cache[cluster] = payload
        print(f"[cache] dashboard data ready for {cluster} — H{payload['latest_hr']}", flush=True)
    except Exception as e:
        print(f"[cache] dashboard refresh FAILED for {cluster}: {e}", flush=True)
        import traceback; traceback.print_exc()
    finally:
        _refreshing.discard(cluster)


async def _refresh_state_cluster(cluster: str):
    key = f"state_{cluster}"
    if key in _refreshing:
        return
    _refreshing.add(key)
    loop = asyncio.get_event_loop()
    try:
        log.info(f"[cache] refreshing state data for {cluster}")
        payload = await loop.run_in_executor(None, _build_state_payload, cluster)
        _state_cache[cluster] = payload
        log.info(f"[cache] state data ready for {cluster}")
    except Exception as e:
        log.warning(f"[cache] state refresh failed for {cluster}: {e}")
    finally:
        _refreshing.discard(key)


async def _refresh_city_cluster(cluster: str):
    key = f"city_{cluster}"
    if key in _refreshing:
        return
    _refreshing.add(key)
    loop = asyncio.get_event_loop()
    try:
        log.info(f"[cache] refreshing city data for {cluster}")
        payload = await loop.run_in_executor(None, _build_city_payload, cluster)
        _city_cache[cluster] = payload
        log.info(f"[cache] city data ready for {cluster}")
    except Exception as e:
        log.warning(f"[cache] city refresh failed for {cluster}: {e}")
    finally:
        _refreshing.discard(key)


async def _background_loop():
    """Warm all clusters on startup, then refresh every REFRESH_INTERVAL seconds."""
    try:
        print("[cache] background loop started — warming india_next first", flush=True)
        # Warm india_next first (most used); others follow sequentially to avoid overloading warehouse
        for c in CLUSTERS:
            r = await asyncio.gather(asyncio.create_task(_refresh_cluster(c)), return_exceptions=True)
            if isinstance(r[0], Exception):
                print(f"[cache] dashboard warm failed for {c}: {r[0]}", flush=True)
        # State + city data after dashboard cache is warm
        secondary_tasks = (
            [asyncio.create_task(_refresh_state_cluster(c)) for c in CLUSTERS] +
            [asyncio.create_task(_refresh_city_cluster(c)) for c in CLUSTERS]
        )
        results2 = await asyncio.gather(*secondary_tasks, return_exceptions=True)
        for r in results2:
            if isinstance(r, Exception):
                print(f"[cache] secondary warm failed: {r}", flush=True)

        while True:
            await asyncio.sleep(REFRESH_INTERVAL)
            refresh_tasks = (
                [asyncio.create_task(_refresh_cluster(c)) for c in CLUSTERS] +
                [asyncio.create_task(_refresh_state_cluster(c)) for c in CLUSTERS] +
                [asyncio.create_task(_refresh_city_cluster(c)) for c in CLUSTERS]
            )
            await asyncio.gather(*refresh_tasks, return_exceptions=True)
    except Exception as e:
        print(f"[cache] background loop crashed: {e}", flush=True)
        import traceback; traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_background_loop())
    yield


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="India Next Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    cached = [c for c in CLUSTERS if c in _cache]
    return {"status": "ok", "time": datetime.now().isoformat(), "cached_clusters": cached}

@app.get("/api/data")
def get_data(cluster: str = "india_next"):
    if cluster in _cache:
        return _cache[cluster]
    return JSONResponse(status_code=202, content={"loading": True, "message": "Data is being fetched, please retry in 30s"})

@app.post("/api/refresh")
async def force_refresh(cluster: str = "india_next"):
    """Invalidate cache and kick off a fresh fetch for the given cluster."""
    _cache.pop(cluster, None)
    asyncio.create_task(_refresh_cluster(cluster))
    return {"status": "refreshing", "cluster": cluster}

_ZERO_STATE = {
    "orders": 0.0, "coupon_orders": 0.0,
    "cdpo_sum": 0.0, "sdpo_sum": 0.0, "rdpo_sum": 0.0,
    "swgd_sum": 0.0, "camp_sum": 0.0, "ec_sum": 0.0, "str_sum": 0.0,
    "sessions": 0.0, "lw_sessions": 0.0, "conv_sessions": 0.0, "lw_conv_sessions": 0.0,
}

def _agg(rows: list[dict], dt_filter) -> dict:
    """Aggregate raw state×hr×dt rows → {state: {hr: sums}} for one dt."""
    from collections import defaultdict
    data: dict = defaultdict(lambda: defaultdict(lambda: dict(_ZERO_STATE)))
    for r in rows:
        if r.get("dt") != dt_filter:
            continue
        state = r.get("state") or "Unknown"
        hr    = int(r["hr"]) if r.get("hr") is not None else -1
        d     = data[state][hr]
        for k in _ZERO_STATE:
            d[k] += r.get(k) or 0.0
    return data

def _derive(d: dict) -> dict:
    o  = d["orders"]
    s  = d["sessions"]
    cs = d["conv_sessions"]
    ls = d["lw_sessions"]
    lcs= d["lw_conv_sessions"]
    def po(x):  return round(x / o, 2) if o else None
    def pct(x): return round(x / o * 100, 1) if o else None
    cvr    = round(cs / s * 100, 2)  if s  else None
    lw_cvr = round(lcs / ls * 100, 2) if ls else None
    return {
        "orders":      round(o) if o else 0,
        "oc_pct":      pct(d["coupon_orders"]),
        "cdpo":        po(d["cdpo_sum"]),
        "sdpo":        po(d["sdpo_sum"]),
        "rdpo":        po(d["rdpo_sum"]),
        "ephemeral":   po(d["swgd_sum"] - d["str_sum"]),
        "str":         po(d["str_sum"]),
        "ec":          po(d["ec_sum"]),
        "camp":        po(d["camp_sum"]),
        "sessions":    round(s) if s else 0,
        "cvr":         cvr,
        "lw_sessions": round(ls) if ls else 0,
        "lw_cvr":      lw_cvr,
    }

@app.get("/api/state-data")
def get_state_data(cluster: str = "india_next"):
    if cluster in _state_cache:
        return _state_cache[cluster]
    # Cache cold — return loading sentinel; background loop will populate
    return JSONResponse(status_code=202, content={"loading": True, "message": "Data is being fetched, please retry in 30s"})

@app.get("/api/city-data")
def get_city_data(cluster: str = "india_next"):
    if cluster in _city_cache:
        return _city_cache[cluster]
    return JSONResponse(status_code=202, content={"loading": True, "message": "Data is being fetched, please retry in 30s"})

# Serve React build (if it exists)
if WEBAPP.exists():
    app.mount("/assets", StaticFiles(directory=str(WEBAPP / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        index = WEBAPP / "index.html"
        return FileResponse(str(index))


import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting India Next Dashboard on http://0.0.0.0:{port}")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
