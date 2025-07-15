from .failure_router import router as failure_router
from .failure_today_router import router as failure_today_router
from .failure_today_ws_router import router as failure_today_ws_router
from .failure_heatup_router import router as failure_heatup_router
from .failure_atsone_router import router as failure_atsone_router
from .failure_atstwo_router import router as failure_atstwo_router
from .failure_atsthree_router import router as failure_atsthree_router
from .failure_vflashone_router import router as failure_vflashone_router

all_routers = [
    failure_router,
    failure_today_router,
    failure_today_ws_router,
    failure_heatup_router,
    failure_atsone_router,
    failure_atstwo_router,
    failure_atsthree_router,
    failure_vflashone_router,
]
