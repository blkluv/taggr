import * as React from "react";
import { userList } from "./common";
import { Content } from "./content";
import { Gem, YinYan } from "./icons";
import { Poll, PostId } from "./types";

export const PollView = ({
    poll,
    post_id,
    created,
}: {
    poll: Poll;
    post_id?: PostId;
    created: number | BigInt;
}) => {
    const [data, setData] = React.useState(poll);
    const [revoteMode, setRevoteMode] = React.useState(false);

    React.useEffect(() => setData(poll), [poll]);

    const radio_group_name = post_id ? `${post_id}-poll` : "poll";
    const user_id = window.user?.id;
    const voted =
        Object.values(data.votes).flat().includes(user_id) && !revoteMode;
    const totalVotes = Object.values(data.votes)
        .map((votes) => votes.length)
        .reduce((acc, e) => acc + e, 0);
    const createdHoursAgo = Math.floor(
        (Number(new Date()) - Number(created) / 1000000) / 1000 / 3600,
    );
    const expired = createdHoursAgo >= poll.deadline;
    const canChangeVote =
        voted &&
        poll.deadline - createdHoursAgo >
            window.backendCache.config.poll_revote_deadline_hours;
    const showVoting = !isNaN(user_id) && !voted && !expired;
    const keyWithMaxVal = (obj: { [key: number]: number }) =>
        Object.keys(obj).reduce(
            ([maxKey, maxVal]: any, key: any) =>
                obj[key] > maxVal ? [key, obj[key]] : [maxKey, maxVal],
            [null, 0],
        )[0];

    return (
        <div className="column_container post_extension" data-meta="skipClicks">
            {data.options.map((option, id) => {
                const votes = (data.votes[id] || []).length;
                const pc =
                    totalVotes > 0 ? Math.ceil((votes / totalVotes) * 100) : 0;
                return (
                    <label
                        key={id}
                        className={showVoting ? "vcentered" : undefined}
                        style={{
                            display: "flex",
                            flexDirection: showVoting ? "row" : "column",
                        }}
                    >
                        {showVoting && (
                            <input
                                type="radio"
                                value={id}
                                name={radio_group_name}
                                className="right_spaced"
                                style={{ marginTop: 0 }}
                                onChange={(e) => {
                                    if (post_id == undefined || !window.user)
                                        return;
                                    e.preventDefault();
                                    let vote = Number(e.target.value);
                                    if (
                                        !confirm(
                                            `Please confirm your choice: ${data.options[vote]}`,
                                        )
                                    )
                                        return;
                                    window.api
                                        .call<any>(
                                            "vote_on_poll",
                                            post_id,
                                            vote,
                                        )
                                        .then((response) => {
                                            if (response.Err) {
                                                alert(
                                                    `Error: ${response.Err}!`,
                                                );
                                                return;
                                            }
                                        });
                                    const list = poll.votes[vote] || [];
                                    list.push(user_id);
                                    poll.votes[vote] = list;
                                    setRevoteMode(false);
                                    setData({ ...poll });
                                }}
                            />
                        )}
                        <Content
                            classNameArg="max_width_col clickable"
                            value={option}
                        />
                        {!showVoting && (
                            <div
                                className="column_container"
                                style={{ margin: "0.5em" }}
                            >
                                <div className="vcentered small_text">
                                    <span
                                        className="right_half_spaced"
                                        style={{
                                            width: "6em",
                                            textAlign: "right",
                                            alignSelf: "flex-start",
                                        }}
                                    >
                                        <code className="right_half_spaced">
                                            {votes}
                                        </code>
                                        <code>({pc}%)</code>
                                    </span>
                                    <div className="max_width_col">
                                        <div
                                            style={{
                                                width: `${pc}%`,
                                                height: "0.6em",
                                                marginTop: "0.1em",
                                            }}
                                            className="active"
                                        ></div>
                                        <div className="small_text top_half_spaced">
                                            {userList(data.votes[id])}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </label>
                );
            })}
            {!expired && (
                <span className="top_spaced small_text text_centered">
                    <span className="inactive">
                        EXPIRES IN {printDelta(data.deadline - createdHoursAgo)}
                    </span>
                    {canChangeVote && (
                        <>
                            &nbsp;&middot;&nbsp;{" "}
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    Object.entries(poll.votes).forEach(
                                        ([option, voters]) => {
                                            poll.votes[Number(option)] =
                                                voters.filter(
                                                    (id) => id != user_id,
                                                );
                                        },
                                    );
                                    setData({ ...poll });
                                    setRevoteMode(true);
                                }}
                            >
                                CHANGE VOTE
                            </a>
                        </>
                    )}
                </span>
            )}
            {expired && (
                <div className="top_spaced">
                    <h4>RESULTS</h4>
                    <div className="small_text">
                        <div className="bottom_half_spaced">
                            <YinYan />{" "}
                            <span className="left_spaced">KARMA: </span>{" "}
                            <Content
                                value={
                                    data.options[
                                        keyWithMaxVal(data.weighted_by_karma)
                                    ]
                                }
                            />
                        </div>
                        <div>
                            <Gem /> <span className="left_spaced">DAO: </span>{" "}
                            <Content
                                value={
                                    data.options[
                                        keyWithMaxVal(data.weighted_by_tokens)
                                    ]
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const printDelta = (delta: number) => {
    const days = Math.floor(delta / 24);
    if (days > 0) return `${days} DAY${days == 1 ? "" : "S"}`;
    return `${Math.max(1, delta)}H`;
};
