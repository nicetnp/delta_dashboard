from .failure_fixture_router import  router as failure_fixture_router
from .failure_filter_router import  router as failure_filter_router
from .failure_station_router import router as failure_station_router
from  .failure_tester_router import router as failure_tester_router
from .calibration_router import  router as calibration_router
all_routers = [
    failure_fixture_router,
    failure_filter_router,
    failure_station_router,
    failure_tester_router,
    calibration_router
]
