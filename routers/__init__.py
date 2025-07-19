from .failure_router import router as failure_router
# from .failure_today_router import router as failure_today_router
from .failure_today_ws_router import router as failure_today_ws_router
from .failure_heatup_router import router as failure_heatup_router
from .failure_atsone_router import router as failure_atsone_router
from .failure_atstwo_router import router as failure_atstwo_router
from .failure_atsthree_router import router as failure_atsthree_router
from .failure_vflashone_router import router as failure_vflashone_router
from .failure_vflashtwo_router import router as failure_vflashtwo_router
from .failure_burnin_router  import router as failure_burnin_router
from .failure_vibration_router import router as failure_vibration_router
from .failure_hipotone_router import router as failure_hipotone_router
from .failure_hipottwo_router  import router as failure_hipottwo_router
from .failure_fixture_router import  router as failure_fixture_router
from .failure_filter_router import  router as failure_filter_router

all_routers = [
    failure_router,
    # failure_today_router,
    failure_today_ws_router,
    failure_heatup_router,
    failure_atsone_router,
    failure_atstwo_router,
    failure_atsthree_router,
    failure_vflashone_router,
    failure_vflashtwo_router,
    failure_vibration_router,
    failure_hipotone_router,
    failure_hipottwo_router,
    failure_hipottwo_router,
    failure_fixture_router,
    failure_filter_router
]
