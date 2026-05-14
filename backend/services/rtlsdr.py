import asyncio
from typing import List

from schemas import RTLDeviceInfo


async def detect_devices() -> List[RTLDeviceInfo]:
    devices: List[RTLDeviceInfo] = []

    try:
        proc = await asyncio.create_subprocess_exec(
            "rtl_test", "-t",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=6.0)
        output = stderr.decode(errors="replace")

        for line in output.splitlines():
            stripped = line.strip()
            # rtl_test lists devices as: "  0:  Realtek, RTL2838UHIDIR, SN: ..."
            if stripped and stripped[0].isdigit() and ":" in stripped:
                parts = stripped.split(":", 1)
                try:
                    idx = int(parts[0].strip())
                    rest = parts[1].strip() if len(parts) > 1 else ""
                    name_parts = [p.strip() for p in rest.split(",")]
                    name = " ".join(name_parts[:2]) if name_parts else "RTL-SDR"
                    serial = name_parts[2].replace("SN:", "").strip() if len(name_parts) > 2 else ""
                    devices.append(
                        RTLDeviceInfo(index=idx, name=name, serial=serial, available=True)
                    )
                except (ValueError, IndexError):
                    pass
    except Exception:
        pass

    if not devices:
        # Fallback: check if rtl_power binary exists
        try:
            proc = await asyncio.create_subprocess_exec(
                "rtl_power", "--help",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=3.0)
            devices.append(
                RTLDeviceInfo(index=0, name="RTL-SDR (no device detected)", serial="", available=True)
            )
        except Exception:
            devices.append(
                RTLDeviceInfo(
                    index=0,
                    name="RTL-SDR (rtl-sdr tools not found in container)",
                    serial="SIM001",
                    available=False,
                )
            )

    return devices


def build_rtl_power_command(job) -> List[str]:
    freq_range = f"{job.start_freq}:{job.end_freq}:{job.bin_size}"
    cmd = [
        "rtl_power",
        "-f", freq_range,
        "-i", str(job.interval),
        "-d", str(job.device_index),
        "-g", str(job.gain) if job.gain is not None else "0",
    ]
    if job.ppm_correction:
        cmd += ["-p", str(job.ppm_correction)]
    cmd.append("-")  # stdout
    return cmd


def parse_rtl_power_line(line: str):
    """Parse one CSV line from rtl_power stdout.

    Format: date, time, hz_low, hz_high, hz_step, samples, dB...
    """
    parts = [p.strip() for p in line.split(",")]
    if len(parts) < 7:
        return None
    try:
        from datetime import datetime

        ts = datetime.strptime(f"{parts[0]} {parts[1]}", "%Y-%m-%d %H:%M:%S")
        hz_low = int(parts[2])
        hz_high = int(parts[3])
        hz_step = float(parts[4])
        db_values = [float(v) for v in parts[6:] if v.strip()]
        return {
            "time": ts,
            "hz_low": hz_low,
            "hz_high": hz_high,
            "hz_step": hz_step,
            "db_values": db_values,
        }
    except (ValueError, IndexError):
        return None
