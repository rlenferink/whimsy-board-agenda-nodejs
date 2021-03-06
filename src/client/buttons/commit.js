import Agenda from "../models/agenda.js";
import Minutes from "../models/minutes.js";
import ModalDialog from "../elements/modal-dialog.js";
import Pending from "../models/pending.js";
import React from "react";
import User from "../models/user.js";
import { Server, post } from "../utils.js";
import jQuery from "jquery";

//
// Commit pending comments and approvals.  Build a default commit message,
// and allow it to be changed.
//
class Commit extends React.Component {
  static button() {
    return {
      text: "commit",
      class: "btn_primary",
      disabled: Server.offline || Minutes.complete || Minutes.draft_posted,
      data_toggle: "modal",
      data_target: "#commit-form"
    }
  };

  state = {disabled: false};

  // commit form: allow the user to confirm or edit the commit message
  render() {
    return <ModalDialog id="commit-form" color="blank">
      <h4>Commit message</h4>
      <textarea id="commit-text" value={this.state.message} rows={5} disabled={this.state.disabled} label="Commit message"/>
      <button className="btn-default" data_dismiss="modal">Close</button>
      <button className="btn-primary" onClick={this.click} disabled={this.state.disabled}>Submit</button>
    </ModalDialog>
  };

  // autofocus on comment text
  mounted() {
    jQuery("#commit-form").on(
      "shown.bs.modal",
      () => document.getElementById("commit-text").focus()
    )
  };

  // update message on re-display
  created() {
    let titles, item;
    let pending = this.props.server.pending;
    let messages = [];

    // common format for message lines
    let append = (title, list) => {
      if (!list) return;

      if (list.length > 0 && list.length < 6) {
        let titles = [];

        for (let item of Agenda.index) {
          if (list.includes(item.attach)) titles.push(item.title)
        };

        messages.push(`${title} ${titles.join(", ")}`)
      } else if (list.length > 1) {
        messages.push(`${title} ${list.length} reports`)
      }
    };

    append("Approve", pending.approved);
    append("Unapprove", pending.unapproved);
    append("Flag", pending.flagged);
    append("Unflag", pending.unflagged);

    // list (or number) of comments made with this commit
    let comments = Object.keys(pending.comments).length;

    if (comments > 0 && comments < 6) {
      titles = [];

      for (let item of Agenda.index) {
        if (pending.comments[item.attach]) titles.push(item.title)
      };

      messages.push(`Comment on ${titles.join(", ")}`)
    } else if (comments > 1) {
      messages.push(`Comment on ${comments} reports`)
    };

    // identify (or number) action item(s) updated with this commit
    if (pending.status) {
      if (pending.status.length === 1) {
        item = pending.status[0];
        let text = item.text;

        if (item.pmc || item.date) {
          text += " [";
          if (item.pmc) text += ` ${item.pmc}`;
          if (item.date) text += ` ${item.date}`;
          text += " ]"
        };

        messages.push(`Update AI: ${text}`)
      } else if (pending.status.length > 1) {
        messages.push(`Update ${pending.status.length} action items`)
      }
    };

    this.setState({message: messages.join("\n")})
  };

  // on click, disable the input fields and buttons and submit
  click(event) {
    this.setState({disabled: true});

    post(
      "commit",
      {message: this.state.message, initials: User.initials},

      (response) => {
        Agenda.load(response.agenda, response.digest);
        Pending.load(response.pending);
        this.setState({disabled: false});

        // delay jQuery updates to give Vue a chance to make updates first
        setTimeout(
          () => {
            jQuery("#commit-form").modal("hide");
            document.body.classList.remove("modal-open");
            jQuery(".modal-backdrop").remove()
          },

          300
        )
      }
    )
  }
};

export default Commit