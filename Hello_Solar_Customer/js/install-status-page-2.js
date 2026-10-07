
        (function () {
            "use strict";

            const installPhaseVal = document.getElementById("installPhaseVal");
            const installPhaseMeta = document.getElementById("installPhaseMeta");
            const installCompletionVal = document.getElementById("installCompletionVal");
            const installCompletionMeta = document.getElementById("installCompletionMeta");
            const installMilestoneVal = document.getElementById("installMilestoneVal");
            const installMilestoneMeta = document.getElementById("installMilestoneMeta");
            const installTargetVal = document.getElementById("installTargetVal");
            const installTargetMeta = document.getElementById("installTargetMeta");

            const installProgressSubtitle = document.getElementById("installProgressSubtitle");
            const installProgressBadge = document.getElementById("installProgressBadge");
            const installProgressBarFill = document.getElementById("installProgressBarFill");
            const milestoneStepsList = document.getElementById("milestoneStepsList");

            const assignedTeamAvatar = document.getElementById("assignedTeamAvatar");
            const assignedTeamName = document.getElementById("assignedTeamName");
            const assignedTeamRole = document.getElementById("assignedTeamRole");
            const assignedTeamPhone = document.getElementById("assignedTeamPhone");
            const assignedTeamNote = document.getElementById("assignedTeamNote");
            const assignedTeamHardware = document.getElementById("assignedTeamHardware");
            const messageTeamBtn = document.getElementById("messageTeamBtn");
            const messageTeamBtnText = document.getElementById("messageTeamBtnText");
            const contactLeadBtn = document.getElementById("contactLeadBtn");
            const contactLeadBtnText = document.getElementById("contactLeadBtnText");
            const dispatchPhoneLink = document.getElementById("dispatchPhoneLink");
            const dispatchPhoneText = document.getElementById("dispatchPhoneText");

            let currentPackage = null;
            let renderToken = 0;

            function renderInstallStatusPage(pkg) {
                if (!pkg) return;
                renderToken++;
                const thisToken = renderToken;
                currentPackage = pkg;

                // Clear previous milestone list to prevent stale artifacts
                if (milestoneStepsList) {
                    milestoneStepsList.innerHTML = "";
                }

                const inst = pkg.install;
                if (!inst) return;

                // 1. Summary Cards
                if (installPhaseVal) installPhaseVal.textContent = inst.phase || "—";
                if (installPhaseMeta) {
                    const dotClass = (inst.phase === "Completed") ? "status-dot" : ((inst.phase === "In Progress") ? "status-dot warning" : "status-dot");
                    installPhaseMeta.innerHTML = `<span class="${dotClass}"></span>${inst.phaseMeta || inst.phaseStatusText || "System installation"}`;
                }

                if (installCompletionVal) installCompletionVal.textContent = `${inst.completionPct || 0}%`;
                if (installCompletionMeta) installCompletionMeta.textContent = inst.milestonesAchieved || "—";

                if (installMilestoneVal) installMilestoneVal.textContent = inst.nextMilestone || "—";
                if (installMilestoneMeta) installMilestoneMeta.textContent = inst.nextMilestoneMeta || "—";

                if (installTargetVal) installTargetVal.textContent = inst.targetCompletion || "—";
                if (installTargetMeta) installTargetMeta.textContent = inst.targetCompletionMeta || "—";

                // 2. Progression Header & Bar
                if (installProgressSubtitle) {
                    installProgressSubtitle.textContent = `Stage progression for ${pkg.name} (${pkg.capacity}) · Account #${pkg.accountNo}`;
                }
                if (installProgressBadge) {
                    installProgressBadge.textContent = `${inst.completionPct}% Complete`;
                    installProgressBadge.className = inst.completionPct === 100 ? "badge badge-paid" : "badge badge-upcoming";
                }
                if (installProgressBarFill) {
                    installProgressBarFill.style.width = `${inst.completionPct}%`;
                }

                // 3. Render 5 Milestones
                if (milestoneStepsList && Array.isArray(inst.milestones)) {
                    inst.milestones.forEach((m, idx) => {
                        const item = document.createElement("div");
                        const isLast = idx === inst.milestones.length - 1;
                        let stateClass = "";
                        let indicatorContent = m.num;

                        if (m.status === "Completed") {
                            stateClass = "completed";
                            indicatorContent = "✓";
                        } else if (m.status === "In Progress") {
                            stateClass = "active";
                        }

                        item.className = `milestone-step-item ${stateClass}`.trim();

                        // Distinguish scheduled vs estimated dates
                        let datePrefix = "";
                        if (m.status === "Completed") {
                            datePrefix = "Completed on ";
                        } else if (m.status === "In Progress") {
                            datePrefix = "Scheduled for ";
                        } else {
                            datePrefix = "Estimated: ";
                        }

                        item.innerHTML = `
                            ${!isLast ? '<div class="step-timeline-connector"></div>' : ''}
                            <div class="step-indicator">${indicatorContent}</div>
                            <div class="step-content">
                                <div class="step-top">
                                    <h3 class="step-title">${m.title}</h3>
                                    <span class="badge ${m.badgeClass || 'badge-neutral'}">${m.status}</span>
                                </div>
                                <p class="step-desc">${m.desc}</p>
                                <div class="step-date">${datePrefix}${m.date}</div>
                            </div>
                        `;

                        milestoneStepsList.appendChild(item);
                    });
                }

                // 4. Assigned Team Card & CTAs
                const installer = pkg.assignedInstaller || (inst && inst.assignedTeam);
                const isPendingTeam = !installer || (installer.name && installer.name.toLowerCase().includes("pending"));
                const team = (!isPendingTeam && installer) ? installer : {
                    name: "Hello Solar Super Admin",
                    initials: "HS",
                    role: "Central Customer Care & Engineering Support",
                    phone: "+63 2 8888 0100",
                    note: "Installer assignment in progress. Your support and installation scheduling are routed directly to Hello Solar Super Admin."
                };

                if (assignedTeamAvatar) assignedTeamAvatar.textContent = team.initials || "HS";
                if (assignedTeamName) assignedTeamName.textContent = team.name;
                if (assignedTeamRole) assignedTeamRole.textContent = team.role;
                if (assignedTeamPhone) assignedTeamPhone.textContent = team.phone;
                if (assignedTeamNote) assignedTeamNote.textContent = team.note;
                if (assignedTeamHardware) assignedTeamHardware.textContent = inst.hardwareSpecs || "Standard Hello Solar System Kit";

                if (isPendingTeam) {
                    if (messageTeamBtnText) messageTeamBtnText.textContent = "Message Super Admin";
                    if (messageTeamBtn) messageTeamBtn.href = `support.html?recipient=SuperAdmin&package=${pkg.id}`;

                    if (contactLeadBtnText) contactLeadBtnText.textContent = "Contact Super Admin";
                    if (contactLeadBtn) contactLeadBtn.href = `support.html?type=installation&package=${pkg.id}`;

                    if (dispatchPhoneLink) dispatchPhoneLink.href = `tel:+63288880100`;
                    if (dispatchPhoneText) dispatchPhoneText.textContent = "Call Super Admin (+63 2 8888 0100)";
                } else {
                    const firstName = team.name.split(" ")[0];
                    if (messageTeamBtnText) messageTeamBtnText.textContent = `Send Message to ${firstName}`;
                    if (messageTeamBtn) messageTeamBtn.href = `support.html?recipient=${encodeURIComponent(team.name)}&package=${pkg.id}`;

                    if (contactLeadBtnText) contactLeadBtnText.textContent = `Contact ${firstName}`;
                    if (contactLeadBtn) contactLeadBtn.href = `support.html?type=installation&lead=${encodeURIComponent(team.name)}&package=${pkg.id}`;

                    if (dispatchPhoneLink) {
                        dispatchPhoneLink.href = `tel:${team.phone.replace(/[^0-9+]/g, '')}`;
                    }
                    if (dispatchPhoneText) {
                        dispatchPhoneText.textContent = `Call ${team.name} (${team.phone})`;
                    }
                }
            }

            // Initial render
            const initialPkg = (window.HelloSolar && window.HelloSolar.getActivePackage)
                ? window.HelloSolar.getActivePackage()
                : null;
            if (initialPkg) renderInstallStatusPage(initialPkg);

            // Listen for package changes from other tabs / sources
            window.addEventListener("helloSolarPackageChanged", (e) => {
                if (e.detail && e.detail.package) {
                    renderInstallStatusPage(e.detail.package);
                }
            });

            // Listen for dataset async load completion
            window.addEventListener("helloSolarDataLoaded", () => {
                const active = window.HelloSolar ? window.HelloSolar.getActivePackage() : null;
                if (active) {
                    renderInstallStatusPage(active);
                }
            });
        })();
    